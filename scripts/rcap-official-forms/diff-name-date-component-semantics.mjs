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

/* The blanks reader is shared with the verifier: see rcap-census-blanks.mjs
 * for why these two files must not each carry their own copy. */
import { blanksOf } from "./rcap-census-blanks.mjs";

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
function classify(before, after) {
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
  /*
   * Defect B reaches further than its first classifier could see. That one
   * requires the caption to have DECIDED the binding -- participant.last_name
   * in, full_legal_name out -- but on South Dakota's arrest-expungement form the
   * blanks are named "Physical Address - defendant" and the field name already
   * decides them. Only the label's descriptor list moves, from
   * [first_name, full_legal_name] to [full_legal_name]. Same defect, same fix,
   * nothing on paper: the caption "Last/Business Name First Name Middle Suffix"
   * names every part and no longer offers a part. Left unclassified it read as
   * six unexplained rows, which is a stop, and the stop would have been wrong.
   *
   * Note which string is tested. The classifier above asks whether the FIELD
   * NAME names every part, which is right when the caption decided the binding
   * because the caption was then the subject. Here the field name is
   * "Physical Address - defendant" and names no part at all; the caption is the
   * thing that names every part, so the caption is what has to be asked.
   */
  if ((asksEveryNamePart || nowModule.captionAsksForEveryNamePart(before.effectiveLabel ?? ""))
      && before.bindingWritable === after.bindingWritable
      && before.bindingFactId === after.bindingFactId
      && (before.byLabelDescriptors ?? []).includes("participant.first_name")
      && !(after.byLabelDescriptors ?? []).includes("participant.first_name")) {
    return {
      defect: "B",
      class: "caption_naming_every_part_no_longer_offers_a_part",
      why:
        "The blank's own name decided its binding, so the caption never reached it and nothing on paper changes. "
        + "The caption names first, middle and last at once, and the part descriptors no longer answer it, so the "
        + "label channel now offers the assembled name alone. This is the same defect as the class above, seen where "
        + "the caption was not the deciding channel."
    };
  }

  /*
   * Defect C: an identifier blank whose spelling the protect rule did not
   * cover. Forms do not agree on how to write this. NC AOC-CR-287 and
   * AOC-CR-296 name the box `SNN`, a transposition on the form itself; WV
   * SCA-C906 names it `PetSocSecno`; IN CCA-XP-0220-7009 collects aliases,
   * dates of birth and numbers in one box named `AliasNamesDOBsSSNs`, where the
   * plural puts a letter after the `n` and the word-boundary anchor stops
   * matching. None of the three reached `government_identifier`, and the rows
   * below say what that cost: two West Virginia families and one North Carolina
   * form bound participant.date_of_birth into a Social Security blank, and
   * Indiana bound participant.full_legal_name into an alias/DOB/SSN box. The
   * committed field maps refuse all four today, which is why no packet byte
   * moves -- but a refusal that lives only in a family's map is one map away
   * from not existing, and the rule is where it belongs.
   */
  if (after.bindingWritable === false && after.bindingReason === "protected_category"
      && before.bindingReason !== "protected_category") {
    return {
      defect: "C",
      class: "identifier_blank_now_reaches_the_protect_rule",
      why:
        "An identifier blank the government_identifier rule did not spell. It is now protected, so the shared "
        + "semantics refuse it rather than relying on each family's map to refuse it separately. Every family "
        + "holding one of these blanks already refuses it in its committed map, so no packet byte moves; what "
        + "changes is that the refusal no longer depends on the map."
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
  const reason = classify(b, a);
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
  fieldsChanged: changed.length,
  fieldsExplained: changed.filter((c) => c.changeClass !== "unexplained").length,
  fieldsUnexplained: changed.filter((c) => c.changeClass === "unexplained").length,
  byChangeClass: changed.reduce((acc, c) => { acc[c.changeClass] = (acc[c.changeClass] ?? 0) + 1; return acc; }, {}),
  protection: {
    statement:
      "No protected field becomes writable and no protect rule loses a term. This correction only ever withholds a "
      + "fallback or re-points a name caption from a part of a name to the whole of it.",
    protectCategoriesRemoved: baseCategories.filter((c) => !nowCategories.includes(c)),
    protectRulesWeakened: lostTerms,
    fieldsWhoseProtectCategoryChanged: protectCategoryMoved.map((c) => c.key),
    fieldsThatBecameWritable: becameWritable.map((c) => c.key),
    holds: baseCategories.every((c) => nowCategories.includes(c)) && lostTerms.length === 0
      && protectCategoryMoved.length === 0 && becameWritable.length === 0
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
