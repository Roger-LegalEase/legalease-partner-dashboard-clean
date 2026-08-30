#!/usr/bin/env node
// Exactly which fields the shared name/date correction moves, and why each one.
//
//   node scripts/rcap-official-forms/diff-name-date-component-semantics.mjs
//
// Two narrow defects in the shared binder are fixed together because they are
// the same mistake seen from two sides -- a blank being classified by words that
// are not about the blank.
//
//   A. An arrest-date component became a name. `DAY`, `MONTH` and `YEAR` match no
//      descriptor by name, so decideBinding fell back to the printed label; the
//      caption harvested beside them is the sentence "1.The Defendant was
//      arrested on the ___ day of ______, ____", and full_legal_name matches the
//      word "Defendant" in it. The participant's own name bound to the month of
//      their arrest.
//
//   B. "First Middle and Last name" resolved to the surname. participant.
//      last_name matches the trailing two words and is ordered ahead of
//      full_legal_name, so most-specific-first picked the part instead of the
//      whole and a defendant caption read "Reyes".
//
// WHY A DIFF RECORD RATHER THAN AN ASSERTION.
//
// Both fixes are to a binder that every censused blank in the corpus passes
// through, and "it should only affect the six fields I was shown" is not
// evidence. This projects every committed census -- BOTH the flat
// field-census.json shape and the census-v1 documents[] shape -- through the
// semantics as they stood at the base commit and as they stand now, and writes
// out every field that moves, each classified against the defect that explains
// it. A row this script cannot classify is reported as `unexplained`, which is
// the number that has to be zero.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);

const SEMANTICS = "scripts/rcap-official-forms/rcap-field-semantics.mjs";
// The Captain head this correction was cut from.
const BASE_SHA = "6f7f139d71d968598806a7bf951a1d91db6c5d1f";
const OVERLAY_ROOT = "data/rcap-all50/overlays";
const OUT = "data/rcap-grade-a/field-semantics/name-date-component-classification-diff.json";
const NAME_FACT = "participant.full_legal_name";
const CENSUS_FILENAMES = ["field-census.json", "field-census.census-v1.json"];

const readJson = (rel) => {
  try { return JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8")); } catch { return null; }
};

/** Every committed census, whatever it is named. */
function censusFiles() {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(rootDir, dir), { withFileTypes: true })) {
      const rel = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (CENSUS_FILENAMES.includes(entry.name)) found.push({ familyDirectory: dir, file: rel });
    }
  };
  walk(OVERLAY_ROOT);
  return found.sort((a, b) => a.file.localeCompare(b.file));
}
const CENSUSES = censusFiles();

/** One census's blanks, flattened. A v1 census nests them under documents[]. */
function blanksOf(census) {
  if (Array.isArray(census?.documents)) {
    return census.documents.flatMap((doc) => (doc.fields ?? []).map((field) => ({
      field, documentId: doc.documentId ?? null, captionOnly: doc.captionOnly === true
    })));
  }
  return (census?.fields ?? []).map((field) => ({ field, documentId: null, captionOnly: false }));
}

/**
 * Every censused blank through one version of the semantics.
 *
 * `withRegionChannel` exists because one of the six fields this correction was
 * raised about is currently protected by an accident. The AR order's printed
 * region heading is the document's own title, "ORDER TO SEAL ARREST UNDER ACT
 * 1460 OF 2013;", which matches the court region rule -- so `Day` and `Month`
 * are refused today as `protected_page_region` and never reach the descriptor
 * channels at all. decideBinding takes a `regionIsDocumentTitle` flag precisely
 * because a title names a form rather than an area of it, so that protection
 * disappears the moment the flag is passed correctly.
 *
 * Projecting with the channel gives the decision the factory makes today.
 * Projecting without it gives the decision underneath, which is the one this
 * correction is actually about. Both are recorded, because a refusal that rests
 * on a form's title is not a refusal.
 */
function project(mod, { withRegionChannel }) {
  const rows = new Map();
  for (const { familyDirectory, file } of CENSUSES) {
    const census = readJson(file);
    for (const { field, documentId, captionOnly } of blanksOf(census)) {
      const subject = field.effectiveLabel ?? field.name;
      const decision = mod.decideBinding({
        name: field.name,
        pdfType: field.type,
        effectiveLabel: field.effectiveLabel ?? null,
        regionHeading: withRegionChannel ? (field.regionHeading ?? null) : null
      }, { captionOnly });
      rows.set(`${familyDirectory}|${documentId ?? "-"}|${field.name}`, {
        familyDirectory,
        censusFile: file,
        documentId,
        fieldName: field.name,
        effectiveLabel: field.effectiveLabel ?? null,
        subjectFirstDescriptor: mod.descriptorsMatching(subject)[0]?.factId ?? null,
        byNameDescriptors: mod.descriptorsMatching(field.name).map((d) => d.factId),
        byLabelDescriptors: field.effectiveLabel
          ? mod.descriptorsMatching(field.effectiveLabel).map((d) => d.factId) : [],
        protectCategory: mod.protectCategoryOf(subject) ?? mod.protectCategoryOf(field.name) ?? null,
        bindingWritable: decision.writable === true,
        bindingFactId: decision.factId ?? null,
        bindingReason: decision.reason ?? null
      });
    }
  }
  return rows;
}

const stage = fs.mkdtempSync(path.join(os.tmpdir(), "name-date-diff-"));
const basePath = path.join(stage, "semantics-base.mjs");
fs.writeFileSync(basePath, execFileSync("git", ["show", `${BASE_SHA}:${SEMANTICS}`], { cwd: rootDir, maxBuffer: 1 << 24 }));
const baseModule = await import(pathToFileURL(basePath).href);
const nowModule = await import(pathToFileURL(path.resolve(rootDir, SEMANTICS)).href);
fs.rmSync(stage, { recursive: true, force: true });

const comparable = (r) => JSON.stringify({
  d: r.subjectFirstDescriptor, n: r.byNameDescriptors, l: r.byLabelDescriptors,
  p: r.protectCategory, w: r.bindingWritable, f: r.bindingFactId, r: r.bindingReason
});

/**
 * Which defect explains one moved row.
 *
 * Classification is by the SHAPE OF THE MOVE, read off the row, not by a list of
 * field names written down in advance. A list would pass by construction; this
 * returns null for anything the two defects do not account for, and the null
 * count is what the verifier holds at zero.
 */
/**
 * The corrections that have landed on this binder SINCE this one.
 *
 * This diff runs BASE_SHA -> the binder as it stands, so it accumulates every
 * later correction as well as its own two defects, exactly as the charge-caption
 * record does and for the reason recorded there: a frozen record would report a
 * later correction as unexplained drift. A row moved by a later correction IS
 * explained -- by that correction's own record, which enumerates and justifies
 * it field by field, and by that correction's own verifier.
 *
 * A row is explained only where that record actually names it and classifies it.
 * A record that is missing, stale, or silent about the key leaves the row
 * unexplained, which is where it belongs.
 */
const LATER_CORRECTIONS = [
  {
    correction: "shared caption infrastructure",
    record: "data/rcap-grade-a/field-semantics/shared-caption-infrastructure-classification-diff.json",
    verifier: "scripts/rcap-official-forms/verify-shared-caption-infrastructure-semantics.mjs"
  }
];
export const explainedByALaterCorrection = new Map();
for (const later of LATER_CORRECTIONS) {
  const laterRecord = readJson(later.record);
  for (const side of ["semanticsOnly", "endToEnd"]) {
    for (const row of laterRecord?.[side]?.changed ?? []) {
      if (row.changeClass === "unexplained") continue;
      if (!explainedByALaterCorrection.has(row.key)) {
        explainedByALaterCorrection.set(row.key, { ...later, changeClass: row.changeClass, defect: row.defect });
      }
    }
  }
}

function classify(before, after, key) {
  const isDateComponent = nowModule.isDateComponentFieldName(before.fieldName);
  const asksEveryNamePart = nowModule.captionAsksForEveryNamePart(before.fieldName);

  if (isDateComponent && before.bindingWritable && before.bindingFactId === NAME_FACT
      && after.bindingWritable === false) {
    return {
      defect: "A",
      class: "date_component_no_longer_takes_the_participant_name",
      why:
        "A day, month or year blank was bound to participant.full_legal_name through the printed-label fallback, "
        + "because the sentence harvested beside it mentions the Defendant. A date component is not a name. The "
        + "fallback is now withheld from a field whose own name is a date component, so the blank is refused."
    };
  }
  if (isDateComponent && before.bindingWritable === false && after.bindingWritable === false
      && before.bindingReason !== after.bindingReason) {
    return {
      defect: "A",
      class: "date_component_refusal_reason_now_states_the_real_reason",
      why:
        "Never writable before or after, so nothing on paper changes. The label offered a fact the blank does not "
        + "hold -- matter.charge, from a caption that runs on into the offence clause -- and it was refused only "
        + "because that descriptor requires an explicit mapping no caller made. It is now refused because a date "
        + "component does not take a fact from its printed label at all, which is the reason that does not depend "
        + "on a caller declining to name it."
    };
  }
  if (asksEveryNamePart && before.bindingFactId === "participant.last_name"
      && after.bindingFactId === NAME_FACT) {
    return {
      defect: "B",
      class: "caption_naming_every_part_now_resolves_to_the_whole_name",
      why:
        "A caption naming first, middle and last at once asks for the assembled name. participant.last_name was "
        + "matching on the trailing substring 'last name' and, being ordered ahead of full_legal_name, winning "
        + "most-specific-first. The three part descriptors now refuse a caption that names every part, so the whole "
        + "name is the only match left."
    };
  }
  const later = explainedByALaterCorrection.get(key);
  if (later) {
    return {
      defect: `later:${later.correction}`,
      class: `moved_by_a_later_correction__${later.changeClass}`,
      why:
        `Neither defect above moves this row. The ${later.correction} correction does: its record `
        + `${later.record} enumerates the row as ${later.changeClass} and justifies it, and its verifier `
        + `${later.verifier} holds it. Recorded here because this diff spans the base commit to the binder as it `
        + "stands, and so accumulates every correction landed since."
    };
  }
  return null;
}

const before = project(baseModule, { withRegionChannel: true });
const after = project(nowModule, { withRegionChannel: true });

const changed = [];
for (const [key, b] of before) {
  const a = after.get(key);
  if (comparable(b) === comparable(a)) continue;
  const reason = classify(b, a, key);
  changed.push({
    key,
    familyDirectory: b.familyDirectory,
    censusFile: b.censusFile,
    documentId: b.documentId,
    fieldName: b.fieldName,
    effectiveLabel: b.effectiveLabel,
    defect: reason?.defect ?? null,
    changeClass: reason?.class ?? "unexplained",
    why: reason?.why ?? "This row moved and neither defect explains it. That is a stop, not a note.",
    from: { writable: b.bindingWritable, factId: b.bindingFactId, reason: b.bindingReason,
      firstDescriptor: b.subjectFirstDescriptor, byName: b.byNameDescriptors, byLabel: b.byLabelDescriptors,
      protectCategory: b.protectCategory },
    to: { writable: a.bindingWritable, factId: a.bindingFactId, reason: a.bindingReason,
      firstDescriptor: a.subjectFirstDescriptor, byName: a.byNameDescriptors, byLabel: a.byLabelDescriptors,
      protectCategory: a.protectCategory }
  });
}
changed.sort((x, y) => x.key.localeCompare(y.key));

// The same diff with the region channel withheld, which is where the AR order's
// Day and Month become visible. Recorded as a count and a key list only; the
// per-field justification is the same as the primary diff's.
const latentBefore = project(baseModule, { withRegionChannel: false });
const latentAfter = project(nowModule, { withRegionChannel: false });
const latentKeys = [...latentBefore.keys()]
  .filter((k) => comparable(latentBefore.get(k)) !== comparable(latentAfter.get(k))).sort();
const latentOnly = latentKeys.filter((k) => !changed.some((c) => c.key === k));

// ---- the two invariants -------------------------------------------------------
const dateComponentTakingAName = (rows) => [...rows.values()].filter((r) =>
  nowModule.isDateComponentFieldName(r.fieldName) && r.bindingWritable && r.bindingFactId === NAME_FACT);
const everyPartCaptionTakingAPart = (rows) => [...rows.values()].filter((r) =>
  nowModule.captionAsksForEveryNamePart(r.fieldName) && r.bindingWritable
  && ["participant.first_name", "participant.middle_name", "participant.last_name"].includes(r.bindingFactId));

// Protection is compared rule by rule and row by row: no category may vanish,
// no rule may lose a term, and no field that was refused may become writable
// unless it is a name caption this correction deliberately re-points.
const baseCategories = baseModule.PROTECT_RULES.map(([c]) => c);
const nowCategories = nowModule.PROTECT_RULES.map(([c]) => c);
const lostTerms = [];
for (const [category, pattern] of baseModule.PROTECT_RULES) {
  const now = nowModule.PROTECT_RULES.find(([c]) => c === category);
  if (!now) { lostTerms.push(`${category} (missing)`); continue; }
  const lost = pattern.source.split("|").filter((t) => !now[1].source.includes(t));
  if (lost.length) lostTerms.push(`${category} lost ${lost.join(", ")}`);
}
const protectCategoryMoved = changed.filter((c) => JSON.stringify(c.from.protectCategory) !== JSON.stringify(c.to.protectCategory));
const becameWritable = changed.filter((c) => c.from.writable === false && c.to.writable === true);
// Split by whose correction moved the row. THIS correction moves no field's
// protect category and that is still asserted exactly. A later correction may
// move one -- adding a category where there was none, or reporting a more
// specific one -- and what has to hold for those rows is the direction: a row
// that gives up a category must not become writable by doing so.
const isOwnRow = (c) => !String(c.defect ?? "").startsWith("later:");
const ownProtectCategoryMoved = protectCategoryMoved.filter(isOwnRow);
const laterProtectCategoryMoved = protectCategoryMoved.filter((c) => !isOwnRow(c));
const laterRowsThatGaveUpProtectionAndBecameWritable = laterProtectCategoryMoved
  .filter((c) => c.from.protectCategory !== null && c.to.protectCategory === null && c.to.writable === true);

const record = {
  schemaVersion: "rcap-name-date-component-diff/v1",
  generatedBy: "scripts/rcap-official-forms/diff-name-date-component-semantics.mjs",
  baseCommit: BASE_SHA,
  semanticsModule: SEMANTICS,
  question:
    "Which committed blanks does the shared name/date correction move, and does a stated defect explain every one?",
  censusesScanned: CENSUSES.length,
  censusFiles: CENSUSES.map((c) => c.file),
  familiesScanned: new Set(CENSUSES.map((c) => c.familyDirectory)).size,
  totalFieldsScanned: before.size,
  scanNote:
    "Every committed census is read, under either filename. The 156 flat censuses carry 5,286 blanks and "
    + "ar-arrest-seal-set's census-v1 carries 66 more across its two documents, which the flat-filename walk used "
    + "by the charge-caption guard does not see.",
  correctionsCovered: [
    {
      correction: "shared name/date field semantics",
      what:
        "A field NAME that is a date component no longer takes a fact from the printed-label fallback, and a "
        + "caption naming first, middle and last at once resolves to the whole name rather than to the surname.",
      record: OUT,
      verifier: "scripts/rcap-official-forms/verify-name-date-component-semantics.mjs"
    },
    ...LATER_CORRECTIONS.map((c) => ({
      correction: c.correction,
      what: "Enumerated and justified in that correction's own record; this diff spans the union because it runs to the current binder.",
      record: c.record,
      verifier: c.verifier
    }))
  ],
  fieldsChanged: changed.length,
  fieldsExplained: changed.filter((c) => c.changeClass !== "unexplained").length,
  fieldsUnexplained: changed.filter((c) => c.changeClass === "unexplained").length,
  byChangeClass: changed.reduce((acc, c) => { acc[c.changeClass] = (acc[c.changeClass] ?? 0) + 1; return acc; }, {}),
  protection: {
    statement:
      "No protected field becomes writable and no protect rule loses a term. This correction only ever withholds a "
      + "fallback or re-points a name caption from a part of a name to the whole of it, and moves no field's "
      + "protect category at all. Rows a later correction moves are listed separately: for those, what is required "
      + "is that none gives up a protect category and becomes writable by doing so.",
    protectCategoriesRemoved: baseCategories.filter((c) => !nowCategories.includes(c)),
    protectRulesWeakened: lostTerms,
    fieldsWhoseProtectCategoryChanged: protectCategoryMoved.map((c) => c.key),
    fieldsWhoseProtectCategoryThisCorrectionChanged: ownProtectCategoryMoved.map((c) => c.key),
    fieldsWhoseProtectCategoryALaterCorrectionChanged: laterProtectCategoryMoved.map((c) => ({
      key: c.key, from: c.from.protectCategory, to: c.to.protectCategory,
      stillRefused: c.to.writable === false, defect: c.defect
    })),
    laterRowsThatGaveUpProtectionAndBecameWritable: laterRowsThatGaveUpProtectionAndBecameWritable.map((c) => c.key),
    fieldsThatBecameWritable: becameWritable.map((c) => c.key),
    holds: baseCategories.every((c) => nowCategories.includes(c)) && lostTerms.length === 0
      && ownProtectCategoryMoved.length === 0
      && laterRowsThatGaveUpProtectionAndBecameWritable.length === 0
      && becameWritable.length === 0
  },
  invariants: [
    {
      id: "no_date_component_takes_a_name",
      statement:
        "No field whose own name is a date component (day, month, year, with or without a repeat index) may resolve "
        + "to a writable participant.full_legal_name.",
      before: dateComponentTakingAName(before).length,
      after: dateComponentTakingAName(after).length,
      holds: dateComponentTakingAName(after).length === 0
    },
    {
      id: "a_caption_naming_every_part_takes_the_whole_name",
      statement:
        "No caption that names first, middle and last at once may resolve to a single part of the name.",
      before: everyPartCaptionTakingAPart(before).length,
      after: everyPartCaptionTakingAPart(after).length,
      holds: everyPartCaptionTakingAPart(after).length === 0
    }
  ],
  latentWithoutTheRegionChannel: {
    question:
      "With the printed-region channel withheld -- which is what a correct regionIsDocumentTitle flag would do to a "
      + "heading that is only the form's own title -- which further blanks does this correction move?",
    totalMoved: latentKeys.length,
    additionalBeyondThePrimaryDiff: latentOnly.length,
    keys: latentOnly,
    note:
      "ar-arrest-seal-set's proposed order is the case. Its `Day` and `Month` bind participant.full_legal_name by "
      + "the identical printed-label route as the petition's, and are refused today only because the order's region "
      + "heading is its own title and the court region rule matches it. This correction refuses them by name, so "
      + "they no longer depend on that accident."
  },
  expectedChangeKeys: changed.map((c) => c.key),
  changed
};

fs.mkdirSync(path.join(rootDir, path.dirname(OUT)), { recursive: true });
fs.writeFileSync(path.join(rootDir, OUT), `${JSON.stringify(record, null, 2)}\n`);

console.log(`${record.totalFieldsScanned} field(s) across ${record.censusesScanned} census(es); `
  + `${record.fieldsChanged} changed, ${record.fieldsUnexplained} unexplained`);
for (const [cls, n] of Object.entries(record.byChangeClass)) console.log(`  ${String(n).padStart(3)}  ${cls}`);
console.log(`protection holds: ${record.protection.holds}; `
  + `invariants: ${record.invariants.map((i) => `${i.id} ${i.before}->${i.after}`).join("; ")}`);
console.log(`latent (region channel withheld): ${record.latentWithoutTheRegionChannel.additionalBeyondThePrimaryDiff} further field(s)`);
