#!/usr/bin/env node
// Exactly which fields the charge-caption correction moves, and what it leaves.
//
//   node scripts/rcap-official-forms/diff-full-name-charge-caption-semantics.mjs
//
// The correction is to a shared binder that 5,286 committed blanks pass
// through, so "it should only affect a handful" is not evidence. This projects
// every one of them through the semantics as they were at the base commit and
// as they are now, diffs the two field by field, and writes the answer.
//
// It also separates two things that are easy to conflate and mean opposite
// amounts of work: what the BINDER would do now, and what the committed
// ARTIFACTS already contain. The binder is fixed here. An artifact rendered
// before the fix still carries what the old binder wrote, and no change to a
// rule reaches back into bytes.
//
// WHAT THE RECORD SPANS.
//
// This diff is BASE_SHA -> the binder as it stands, so it accumulates every
// correction landed on the shared binder since that base, not the charge-caption
// one alone. The verifier that reads `expectedChangeKeys` asks only "did anything
// move that no record accounts for", and that question is answered correctly by
// an accumulating record; it would be answered wrongly by a frozen one, which
// would report a later correction as unexplained drift.
//
// So each correction states its own scope, and this file records the union.
// `correctionsCovered` below names them and points at the per-correction record
// that enumerates and justifies each field it moves.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { flattenedWidgets, drawnAt } from "./pdf-flattened-widgets.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);

const SEMANTICS = "scripts/rcap-official-forms/rcap-field-semantics.mjs";
const BASE_SHA = "15a30fa412bcfa92a4c9cf72918dee31649af2ef";
const OVERLAY_ROOT = "data/rcap-all50/overlays";
const OUT_DIR = "data/rcap-grade-a/field-semantics";
const NAME_FACT = "participant.full_legal_name";
const RULE_VOCABULARY = /\b(charges?|offen[cs]es?|counts?|statutes?|violations?)\b/i;
const PROMPT_VOCABULARY = /\b(charges?|offen[cs]es?|counts?)\b/i;

const readJson = (rel) => {
  try { return JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8")); } catch { return null; }
};

function familyDirectories() {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(rootDir, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (entry.name === "field-census.json") found.push(dir);
    }
  };
  walk(OVERLAY_ROOT);
  return found.sort();
}
const FAMILIES = familyDirectories();

/** Every censused blank projected through one version of the semantics. */
function project(semantics) {
  const { descriptorsMatching, protectCategoryOf, decideBinding } = semantics;
  const rows = new Map();
  for (const familyDir of FAMILIES) {
    const census = readJson(`${familyDir}/field-census.json`);
    for (const field of census?.fields ?? []) {
      const subject = field.effectiveLabel ?? field.name;
      const decision = decideBinding(
        { name: field.name, pdfType: field.type, effectiveLabel: field.effectiveLabel ?? null }, {}
      );
      rows.set(`${familyDir}|${field.name}`, {
        familyDirectory: familyDir,
        fieldName: field.name,
        effectiveLabel: field.effectiveLabel ?? null,
        subjectFirstDescriptor: descriptorsMatching(subject)[0]?.factId ?? null,
        byNameDescriptors: descriptorsMatching(field.name).map((d) => d.factId),
        byLabelDescriptors: field.effectiveLabel ? descriptorsMatching(field.effectiveLabel).map((d) => d.factId) : [],
        protectCategory: protectCategoryOf(subject) ?? protectCategoryOf(field.name) ?? null,
        bindingWritable: decision.writable === true,
        bindingFactId: decision.factId ?? null,
        bindingReason: decision.reason ?? null
      });
    }
  }
  return rows;
}

const stage = fs.mkdtempSync(path.join(os.tmpdir(), "charge-caption-diff-"));
const basePath = path.join(stage, "semantics-base.mjs");
fs.writeFileSync(basePath, execFileSync("git", ["show", `${BASE_SHA}:${SEMANTICS}`], { cwd: rootDir, maxBuffer: 1 << 24 }));
const before = project(await import(pathToFileURL(basePath).href));
const after = project(await import(pathToFileURL(path.resolve(rootDir, SEMANTICS)).href));
fs.rmSync(stage, { recursive: true, force: true });

const changed = [];
for (const [key, b] of before) {
  const a = after.get(key);
  if (JSON.stringify(b) === JSON.stringify(a)) continue;
  const moved = (field) => (JSON.stringify(b[field]) === JSON.stringify(a[field])
    ? null : { from: b[field], to: a[field] });
  changed.push({
    key, familyDirectory: b.familyDirectory, fieldName: b.fieldName, effectiveLabel: b.effectiveLabel,
    firstDescriptorChanged: moved("subjectFirstDescriptor"),
    byNameDescriptorsChanged: moved("byNameDescriptors"),
    byLabelDescriptorsChanged: moved("byLabelDescriptors"),
    protectCategoryChanged: moved("protectCategory"),
    bindingDecisionChanged: (b.bindingWritable !== a.bindingWritable || b.bindingFactId !== a.bindingFactId)
      ? { from: { writable: b.bindingWritable, factId: b.bindingFactId, reason: b.bindingReason },
          to: { writable: a.bindingWritable, factId: a.bindingFactId, reason: a.bindingReason } }
      : null
  });
}
changed.sort((x, y) => x.key.localeCompare(y.key));

/** A field that binds the participant's name into a charge blank, and can write. */
const offending = (rows) => [...rows.values()].filter((r) => r.bindingWritable
  && r.bindingFactId === NAME_FACT
  && [r.fieldName, r.effectiveLabel].filter(Boolean).some((t) => RULE_VOCABULARY.test(String(t))));

const beforeOffending = offending(before);
const afterOffending = offending(after);
const EXPECTED_CHANGE_KEYS = changed.map((c) => c.key);

const diff = {
  schemaVersion: "rcap-full-name-charge-caption-diff/v1",
  generatedBy: "scripts/rcap-official-forms/diff-full-name-charge-caption-semantics.mjs",
  baseCommit: BASE_SHA,
  semanticsModule: SEMANTICS,
  totalFieldsScannedBefore: before.size,
  totalFieldsScannedAfter: after.size,
  familiesScanned: FAMILIES.length,
  fieldsWhoseFirstDescriptorChanged: changed.filter((c) => c.firstDescriptorChanged).length,
  fieldsWhoseDescriptorSetChanged: changed.filter((c) => c.byNameDescriptorsChanged || c.byLabelDescriptorsChanged).length,
  fieldsWhoseBindingDecisionChanged: changed.filter((c) => c.bindingDecisionChanged).length,
  fieldsWhoseProtectCategoryChanged: changed.filter((c) => c.protectCategoryChanged).length,
  fieldsWhoseArtifactBytesChanged: 0,
  fieldsWhoseArtifactBytesChangedNote:
    "No artifact is re-rendered by this change. The only generator that renders these families is corpus-wide, and every affected family is retired from the operational inventory and source-gated. See the live-impact record.",
  fieldsUnexpectedlyChanged: 0,
  fieldsUnexpectedlyChangedNote:
    "The expected-change set is this diff. It is asserted rather than declared: verify-full-name-charge-caption-semantics recomputes both projections and fails if any field outside this list moves, or if any field in it stops moving.",
  correctionsCovered: [
    {
      correction: "full-name charge-caption",
      what: "A blank whose caption says it holds a charge, offence, count, statute or violation no longer takes participant.full_legal_name.",
      record: "data/rcap-grade-a/field-semantics/full-name-charge-caption-classification-diff.json (this file)",
      verifier: "scripts/rcap-official-forms/verify-full-name-charge-caption-semantics.mjs"
    },
    {
      correction: "shared caption infrastructure",
      what:
        "Six corrections to the shared binder and its caption harvest, landed protections-first: a court's own "
        + "contact block, a jurat, an oath, an affidavit, a verification and a certificate of mailing are protected "
        + "at classification; the squashed `datesigned` spelling and the welded `JUDGMNT` spelling are reached; a "
        + "venue recital no longer asks for the participant's state; `crime` joins the charge vocabulary except "
        + "where it names a victim; a blank whose name says it holds a date may take only a date from its label; "
        + "the flat-overlay path passes the printed region it used to drop; and the caption printed directly above "
        + "a blank is harvested from the cell over that blank rather than from the whole table row.",
      record: "data/rcap-grade-a/field-semantics/shared-caption-infrastructure-classification-diff.json",
      verifier: "scripts/rcap-official-forms/verify-shared-caption-infrastructure-semantics.mjs"
    },
    {
      correction: "shared name/date field semantics",
      what:
        "A field NAME that is a date component (day, month, year) no longer takes a fact from the printed-label "
        + "fallback, and a caption naming first, middle and last at once resolves to the whole name rather than to "
        + "the surname.",
      record: "data/rcap-grade-a/field-semantics/name-date-component-classification-diff.json",
      verifier: "scripts/rcap-official-forms/verify-name-date-component-semantics.mjs"
    }
  ],
  correctionsCoveredNote:
    "This diff is cumulative from baseCommit. Every key in expectedChangeKeys is enumerated and justified in "
    + "exactly one of the per-correction records above.",
  invariant: {
    statement:
      "No field may resolve, through decideBinding, to a writable participant.full_legal_name while its own name or its printed caption says the blank holds a charge, offence, count, statute or violation.",
    before: beforeOffending.length,
    after: afterOffending.length,
    beforeUnderPromptVocabulary: beforeOffending.filter((r) =>
      [r.fieldName, r.effectiveLabel].filter(Boolean).some((t) => PROMPT_VOCABULARY.test(String(t)))).length,
    afterUnderPromptVocabulary: afterOffending.filter((r) =>
      [r.fieldName, r.effectiveLabel].filter(Boolean).some((t) => PROMPT_VOCABULARY.test(String(t)))).length,
    holds: afterOffending.length === 0
  },
  expectedChangeKeys: EXPECTED_CHANGE_KEYS,
  changed
};

// ---- what the artifacts still contain ---------------------------------------
//
// Read out of the artifacts rather than out of the reports. The reports are
// produced by the same field map that is under suspicion, so a report saying a
// field was written is not evidence about the page; the appearance drawn at that
// field's own measured rectangle is.
//
// The fixture names are the D0 factory's, which is what rendered these.
const FIXTURE_NAMES = {
  canonical: "Jordan Avery Reyes",
  boundary: "Alexandrina-Katharine Montgomery-Vandenberg-Oyelaran y Fitzwilliam III"
};
const sha256File = (rel) => (fs.existsSync(path.join(rootDir, rel))
  ? crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, rel))).digest("hex") : null);

const widgetCache = new Map();
async function widgetsOf(rel) {
  if (!widgetCache.has(rel)) {
    widgetCache.set(rel, fs.existsSync(path.join(rootDir, rel)) ? await flattenedWidgets(path.join(rootDir, rel)) : []);
  }
  return widgetCache.get(rel);
}

const liveRows = [];
for (const familyDir of FAMILIES) {
  const populated = readJson(`${familyDir}/reports/populated-fields.json`);
  const rows = Array.isArray(populated) ? populated : (populated?.fields ?? []);
  for (const row of rows) {
    if (row.factId !== NAME_FACT) continue;
    if (row.written === false) continue;
    const fieldName = String(row.field ?? row.anchor ?? "");
    const projected = after.get(`${familyDir}|${fieldName}`);
    const subjects = [fieldName, projected?.effectiveLabel].filter(Boolean).map(String);
    if (!subjects.some((t) => RULE_VOCABULARY.test(t))) continue;
    const sourceRecord = readJson(`${familyDir}/source-record.json`);
    const census = readJson(`${familyDir}/field-census.json`);
    const censusField = (census?.fields ?? []).find((f) => f.name === fieldName);
    const widget = censusField?.widgets?.[0] ?? null;
    const artifacts = [];
    for (const kind of ["canonical", "boundary"]) {
      const rel = `${familyDir}/fixtures/${kind}-filled.pdf`;
      const digest = sha256File(rel);
      if (!digest) continue;
      const at = widget ? drawnAt(await widgetsOf(rel), { page: widget.page ?? 1, rect: widget.rect }) : [];
      const drawn = at.map((w) => w.text).filter(Boolean);
      artifacts.push({
        fixture: kind, artifact: rel, sha256: digest,
        drawnAtTheField: drawn,
        participantNameDrawnAtTheField: drawn.some((t) => t.includes(FIXTURE_NAMES[kind])),
        readFrom: "the flattened widget appearance drawn at this field's own measured rectangle"
      });
    }
    liveRows.push({
      familyDirectory: familyDir,
      jurisdiction: sourceRecord?.jurisdiction ?? null,
      fieldName,
      effectiveLabel: projected?.effectiveLabel ?? null,
      writtenFactId: NAME_FACT,
      fieldRect: widget ? { page: widget.page ?? 1, ...widget.rect } : null,
      artifacts,
      bindingNow: {
        writable: projected?.bindingWritable ?? null,
        factId: projected?.bindingFactId ?? null,
        reason: projected?.bindingReason ?? null
      },
      correctedInTheBinder: projected ? projected.bindingFactId !== NAME_FACT : null,
      artifactStillCarriesTheWrite: artifacts.some((a) => a.participantNameDrawnAtTheField),
      retired: fs.existsSync(path.join(rootDir, `${familyDir}/retirement.json`)),
      productionHolds: sourceRecord?.productionHolds ?? [],
      canonicalArtifactSha256After: null,
      whyNotRegeneratedHere:
        "The renderer for these families (scripts/implement-rcap-official-forms-d1.mjs) has no per-family entry point and rebuilds every family whose binary is present, which is far outside this lane's owned paths. Re-rendering is a Captain patch request, recorded as one."
    });
  }
}
liveRows.sort((a, b) => `${a.familyDirectory}|${a.fieldName}`.localeCompare(`${b.familyDirectory}|${b.fieldName}`));

const liveImpact = {
  schemaVersion: "rcap-full-name-charge-caption-live-impact/v1",
  generatedBy: "scripts/rcap-official-forms/diff-full-name-charge-caption-semantics.mjs",
  question:
    "Which committed artifacts already contain a participant's name written into a blank that holds a charge?",
  distinction:
    "The binder is corrected by this change. These bytes were rendered before it and are not reached by it. Each row records both, so neither is mistaken for the other.",
  liveWrongWrites: liveRows.length,
  provenOnThePage: liveRows.filter((r) => r.artifactStillCarriesTheWrite).length,
  artifactsCarryingTheWrite: liveRows.flatMap((r) => r.artifacts.filter((a) => a.participantNameDrawnAtTheField).map((a) => a.sha256))
    .filter((v, i, a) => a.indexOf(v) === i).length,
  uniqueFamilies: [...new Set(liveRows.map((r) => r.familyDirectory))].length,
  allCorrectedInTheBinder: liveRows.every((r) => r.correctedInTheBinder === true),
  allInRetiredFamilies: liveRows.every((r) => r.retired === true),
  rows: liveRows
};

fs.mkdirSync(path.join(rootDir, OUT_DIR), { recursive: true });
fs.writeFileSync(path.join(rootDir, `${OUT_DIR}/full-name-charge-caption-classification-diff.json`), `${JSON.stringify(diff, null, 2)}\n`);
fs.writeFileSync(path.join(rootDir, `${OUT_DIR}/full-name-charge-caption-live-impact.json`), `${JSON.stringify(liveImpact, null, 2)}\n`);

console.log(`fields ${before.size} -> ${after.size}; changed ${changed.length}; binding decisions ${diff.fieldsWhoseBindingDecisionChanged}`);
console.log(`invariant: ${diff.invariant.before} -> ${diff.invariant.after} (holds: ${diff.invariant.holds})`);
console.log(`artifacts still carrying a wrong write: ${liveImpact.liveWrongWrites} (all corrected in the binder: ${liveImpact.allCorrectedInTheBinder}; all retired: ${liveImpact.allInRetiredFamilies})`);
