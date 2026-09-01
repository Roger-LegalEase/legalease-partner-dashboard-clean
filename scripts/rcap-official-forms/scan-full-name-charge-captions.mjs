#!/usr/bin/env node
// Every censused blank where the participant's NAME would be written into a
// blank that asks for a charge, an offence or a count.
//
//   node scripts/rcap-official-forms/scan-full-name-charge-captions.mjs
//   node scripts/rcap-official-forms/scan-full-name-charge-captions.mjs --phase before
//   node scripts/rcap-official-forms/scan-full-name-charge-captions.mjs --phase after
//
// WHY THIS EXISTS
//
// `participant.full_legal_name` matches a bare `\bname\b`, deliberately: forms
// name that blank a hundred ways and the descriptor list is authored rather
// than inferred. The cost is that a caption which merely CONTAINS a name token
// can claim it, and several committed captions do -- most of them sentences
// where the word is "the above-named Defendant" while the blank itself holds
// the offence that defendant was convicted of.
//
// Oregon's two table headings were fixed already, anchored to the whole caption
// so it could not reach a sentence. This finds what that anchoring left behind.
//
// The scan is deliberately blunt about MATCHING and careful about IMPACT. It
// reports every field whose first descriptor is the name and whose caption
// mentions a charge, offence or count -- including the ones that turn out to be
// legitimate name blanks -- and then classifies what would actually happen,
// because "this caption matches" and "a participant's name is printed as their
// offence" are different claims and only the second is a defect on the page.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);

const OVERLAY_ROOT = "data/rcap-all50/overlays";
const OUT_DIR = "data/rcap-grade-a/field-semantics";
const NAME_FACT = "participant.full_legal_name";

// Two vocabularies, because they answer two different questions and conflating
// them hid the only live defect in the corpus.
//
// PROMPT_VOCABULARY is charge, offence and count: the set the invariant for this
// work is stated over. RULE_VOCABULARY is what the correction actually covers,
// and adds statute and violation, because a form that asks for "the statute
// violated" is asking for the same thing in other words. The one field where a
// participant's name was written into a blank holding a statute citation --
// Arkansas ACIC's "...was found guilty in violation" -- is inside the second and
// outside the first.
export const PROMPT_VOCABULARY = /\b(charges?|offen[cs]es?|counts?)\b/i;
export const RULE_VOCABULARY = /\b(charges?|offen[cs]es?|counts?|statutes?|violations?)\b/i;

const phaseArg = process.argv.indexOf("--phase");
const PHASE = phaseArg >= 0 ? process.argv[phaseArg + 1] : null;
// The semantics module can be pointed at a version other than the one on disk,
// so the same scan produces the before and the after without stashing anything.
const semanticsArg = process.argv.indexOf("--semantics");
const SEMANTICS = semanticsArg >= 0 ? process.argv[semanticsArg + 1] : "scripts/rcap-official-forms/rcap-field-semantics.mjs";
const { descriptorsMatching, protectCategoryOf, decideBinding } =
  await import(pathToFileURL(path.resolve(rootDir, SEMANTICS)).href);

const readJson = (rel) => {
  try { return JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8")); } catch { return null; }
};
const exists = (rel) => fs.existsSync(path.join(rootDir, rel));
const sha256File = (rel) => (exists(rel)
  ? crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, rel))).digest("hex")
  : null);

/** Every family directory holding a field census, relative to the repository. */
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

/**
 * The family's classification, indexed by whatever it calls a field.
 *
 * Eight different entry shapes are committed across the corpus -- some record
 * `name` and `class`, some `field` and `reason`, one records `writable` with an
 * intrinsic category beside it. Normalising here rather than at each use keeps
 * the scan's own logic about the question it is asking.
 */
function classificationIndex(familyDir) {
  const record = readJson(`${familyDir}/field-classification.json`)
    ?? readJson(`${familyDir}/specification/field-classification.json`);
  const rows = record?.entries ?? record?.fields ?? record?.classifications ?? [];
  const index = new Map();
  for (const row of rows) {
    const key = row.name ?? row.field ?? row.label ?? null;
    if (key === null) continue;
    index.set(String(key), {
      classification: row.class ?? row.classification
        ?? (row.writable === true ? "writable" : row.writable === false ? "not_writable" : null),
      reason: row.reason ?? row.basis ?? row.intrinsicReason ?? null,
      protectCategory: row.protectCategory ?? row.protectedCategory ?? row.category ?? null,
      factId: row.factId ?? row.intrinsicFactId ?? null
    });
  }
  return index;
}

/** What the family's own records say was written, indexed by field name. */
function writeIndex(familyDir) {
  const index = new Map();
  const add = (key, value) => {
    if (key === null || key === undefined) return;
    const existing = index.get(String(key)) ?? { written: null, factIds: new Set(), sources: [] };
    if (value.written !== undefined && value.written !== null) existing.written = value.written;
    if (value.factId) existing.factIds.add(value.factId);
    if (value.source) existing.sources.push(value.source);
    index.set(String(key), existing);
  };

  const populated = readJson(`${familyDir}/reports/populated-fields.json`);
  const populatedRows = Array.isArray(populated) ? populated : (populated?.fields ?? populated?.populated ?? []);
  for (const row of populatedRows) {
    // A row that appears in populated-fields with no `written` key is a row the
    // report lists BECAUSE it was written; the key only appears where the
    // family also records refusals.
    add(row.field ?? row.anchor, {
      written: row.written ?? true,
      factId: row.factId ?? null,
      source: `${familyDir}/reports/populated-fields.json`
    });
  }

  for (const fixture of ["canonical", "boundary"]) {
    const record = readJson(`${familyDir}/fixtures/${fixture}.json`);
    for (const row of record?.written ?? []) {
      add(row.field ?? row.anchor, {
        written: true, factId: row.factId ?? null,
        source: `${familyDir}/fixtures/${fixture}.json`
      });
    }
  }
  return index;
}

/** What the family's field map intends to bind, indexed by field name. */
function bindingIndex(familyDir) {
  const index = new Map();
  for (const name of ["overlay-profile.json", "production-field-map.json", "overlay-profile.derived.json"]) {
    const record = readJson(`${familyDir}/${name}`);
    for (const row of record?.bindings ?? []) index.set(String(row.field ?? row.name ?? row.label), row.factId ?? null);
    for (const row of record?.anchors ?? []) index.set(String(row.label ?? row.field), row.factId ?? null);
  }
  return index;
}

const NON_TEXT_TYPE = /check|button|radio|choice|dropdown|combo|list/i;

/**
 * What would actually happen at this blank, from the family's own records.
 *
 * Precedence is deliberate. "Is the participant's name printed here today" is
 * asked first, because that is the only class that is a defect on a page a
 * participant would file; everything below it is a defect in what the binder
 * BELIEVES, which still has to be corrected but is not currently visible.
 */
function impactOf({ pdfType, classification, protectCategory, write, binding }) {
  const writtenNow = write?.written === true;
  const factIds = write ? [...write.factIds] : [];
  if (writtenNow && (factIds.includes(NAME_FACT) || binding === NAME_FACT)) return "LIVE_WRONG_WRITE";
  if (writtenNow) return "LIVE_WRITE_VIA_OTHER_PATH";
  if (protectCategory || /protect/i.test(String(classification ?? ""))) return "PROTECTED_BEFORE_WRITE";
  if (NON_TEXT_TYPE.test(String(pdfType ?? ""))) return "CHECKBOX_OR_NON_TEXT_PATH";
  if (classification) return "CLASSIFIED_BUT_NOT_WRITTEN";
  return "AMBIGUOUS_REQUIRES_REVIEW";
}

/** Every row this scan reports, in a stable order. */
export function collectRows() {
  const rows = [];
  let fieldsScanned = 0;
  const families = familyDirectories();

  for (const familyDir of families) {
    const census = readJson(`${familyDir}/field-census.json`);
    if (!census) continue;
    const sourceRecord = readJson(`${familyDir}/source-record.json`);
    const classifications = classificationIndex(familyDir);
    const writes = writeIndex(familyDir);
    const bindings = bindingIndex(familyDir);

    for (const field of census.fields ?? []) {
      fieldsScanned += 1;
      const subject = field.effectiveLabel ?? field.name;
      if (!subject) continue;
      const descriptors = descriptorsMatching(subject);
      // Both channels, because decideBinding tries the field NAME first and only
      // falls back to the printed label. Six live wrong writes were reachable
      // only through the name, so a scan that looked at one subject would have
      // reported the corpus clean.
      const decision = decideBinding(
        { name: field.name, pdfType: field.type, effectiveLabel: field.effectiveLabel ?? null }, {}
      );
      const captionSubjects = [subject, field.name].filter(Boolean).map(String);
      const nameIsClaimed = descriptors[0]?.factId === NAME_FACT || decision.factId === NAME_FACT;
      const mentionsRule = captionSubjects.some((t) => RULE_VOCABULARY.test(t));
      if (!nameIsClaimed || !mentionsRule) continue;

      const classification = classifications.get(String(field.name)) ?? null;
      const write = writes.get(String(field.name)) ?? null;
      const binding = bindings.get(String(field.name)) ?? bindings.get(String(subject)) ?? null;
      const protectCategory = protectCategoryOf(subject) ?? protectCategoryOf(field.name) ?? null;

      rows.push({
        familyDirectory: familyDir,
        jurisdiction: sourceRecord?.jurisdiction ?? familyDir.split("/")[1] ?? null,
        packetFamilyId: census.family ?? sourceRecord?.family ?? null,
        fieldName: field.name,
        effectiveLabel: field.effectiveLabel ?? null,
        pdfType: field.type ?? null,
        page: field.page ?? null,
        firstDescriptor: descriptors[0]?.factId ?? null,
        allDescriptors: descriptors.map((d) => d.factId),
        binderFactId: decision.factId ?? null,
        binderWritable: decision.writable === true,
        binderReason: decision.reason ?? null,
        matchesPromptVocabulary: captionSubjects.some((t) => PROMPT_VOCABULARY.test(t)),
        matchesRuleVocabulary: mentionsRule,
        protectCategory: classification?.protectCategory ?? protectCategory,
        currentClassification: classification?.classification ?? null,
        classificationReason: classification?.reason ?? null,
        overlayAnchorPresent: binding !== null,
        overlayAnchorFactId: binding,
        populatedFieldsEntryPresent: write !== null,
        currentArtifactWriteObserved: write?.written === true,
        currentArtifactWriteFactIds: write ? [...write.factIds].sort() : [],
        impactClass: impactOf({
          pdfType: field.type, classification: classification?.classification,
          protectCategory: classification?.protectCategory ?? protectCategory, write, binding
        }),
        evidencePaths: [
          `${familyDir}/field-census.json`,
          ...(exists(`${familyDir}/field-classification.json`) ? [`${familyDir}/field-classification.json`] : []),
          ...(exists(`${familyDir}/reports/populated-fields.json`) ? [`${familyDir}/reports/populated-fields.json`] : []),
          ...(write?.sources ?? [])
        ].filter((v, i, a) => a.indexOf(v) === i),
        canonicalArtifactSha256: sha256File(`${familyDir}/fixtures/canonical-filled.pdf`),
        boundaryArtifactSha256: sha256File(`${familyDir}/fixtures/boundary-filled.pdf`)
      });
    }
  }
  rows.sort((a, b) => `${a.familyDirectory}|${a.fieldName}`.localeCompare(`${b.familyDirectory}|${b.fieldName}`));
  return { rows, fieldsScanned, familiesScanned: families.length };
}

const { rows, fieldsScanned, familiesScanned } = collectRows();
const byImpact = {};
for (const row of rows) byImpact[row.impactClass] = (byImpact[row.impactClass] ?? 0) + 1;

const doc = {
  schemaVersion: "rcap-full-name-charge-caption-scan/v1",
  generatedBy: "scripts/rcap-official-forms/scan-full-name-charge-captions.mjs",
  phase: PHASE,
  question:
    "Which censused blanks would take participant.full_legal_name while their own printed caption mentions a charge, an offence or a count?",
  matchRule: {
    nameIsClaimed: `descriptorsMatching(effectiveLabel ?? name)[0] is ${NAME_FACT}, or decideBinding resolves to it`,
    promptVocabulary: String(PROMPT_VOCABULARY),
    ruleVocabulary: String(RULE_VOCABULARY)
  },
  matchesPromptVocabulary: rows.filter((r) => r.matchesPromptVocabulary).length,
  liveWrongWrites: rows.filter((r) => r.impactClass === "LIVE_WRONG_WRITE").length,
  note:
    "Matching is deliberately blunt and impact is careful. A caption can mention an offence and still be a name blank; those rows are reported and are expected to keep binding the name.",
  familiesScanned,
  fieldsScanned,
  matches: rows.length,
  byImpactClass: byImpact,
  rows
};

const serialized = `${JSON.stringify(doc, null, 2)}\n`;
if (PHASE) {
  fs.mkdirSync(path.join(rootDir, OUT_DIR), { recursive: true });
  const out = `${OUT_DIR}/full-name-charge-caption-${PHASE}.json`;
  fs.writeFileSync(path.join(rootDir, out), serialized);
  console.log(`Wrote ${out}`);
}
console.log(`families ${familiesScanned}  fields ${fieldsScanned}  matches ${rows.length}`);
for (const [impact, count] of Object.entries(byImpact).sort()) console.log(`  ${String(count).padStart(3)}  ${impact}`);
for (const row of rows) {
  console.log(`  ${row.impactClass.padEnd(28)} ${row.jurisdiction ?? "??"}  ${row.fieldName}  ${JSON.stringify(String(row.effectiveLabel ?? "").slice(0, 62))}`);
}
