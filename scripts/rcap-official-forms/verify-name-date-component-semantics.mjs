#!/usr/bin/env node
// The shared name/date correction, held in place.
//
//   node scripts/rcap-official-forms/verify-name-date-component-semantics.mjs
//
// Four things are checked, and they fail for different reasons.
//
//   1. The two rules themselves, stated as the exact field names and captions
//      committed in the corpus, with controls: a date component no longer takes
//      a name, a caption naming every part of a name takes the whole name, and
//      neither rule reaches anything it was not meant to reach.
//   2. The blast radius. Both projections are recomputed over every committed
//      census -- under either filename, so ar-arrest-seal-set's census-v1 is
//      included -- and the set of fields that move must be exactly the set the
//      committed record enumerates, with none of them unexplained.
//   3. Protection. No protect category removed, no protect rule term lost, no
//      field that was refused made writable.
//   4. The invariants, recomputed rather than read out of the record.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);

import { blanksOf } from "./rcap-census-blanks.mjs";

const SEMANTICS = "scripts/rcap-official-forms/rcap-field-semantics.mjs";
const BASE_SHA = "6f7f139d71d968598806a7bf951a1d91db6c5d1f";
const RECORD = "data/rcap-grade-a/field-semantics/name-date-component-classification-diff.json";
const OVERLAY_ROOT = "data/rcap-all50/overlays";
const NAME_FACT = "participant.full_legal_name";
const NAME_PARTS = ["participant.first_name", "participant.middle_name", "participant.last_name"];
const CENSUS_FILENAMES = ["field-census.json", "field-census.census-v1.json"];

const failures = [];
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const semantics = await import(pathToFileURL(path.resolve(rootDir, SEMANTICS)).href);
const {
  decideBinding, descriptorsMatching, isDateComponentFieldName, captionAsksForEveryNamePart, PROTECT_RULES
} = semantics;

console.log("shared name/date field semantics\n");

// ---- 1a. DEFECT A: a date component is not a name ----------------------------
//
// Quoted from the corpus: the field name, and the caption the harvester actually
// captured beside it, imperfections included. MONTH picked up the wrong sentence
// and YEAR picked up the digit "1", which is exactly why the rule is anchored to
// the name.
const DATE_COMPONENTS = [
  ["AR petition DAY", "DAY", "1.The Defendant was arrested on the"],
  ["AR petition MONTH", "MONTH", "Comes the Defendant and for his/her petition to seal the r"],
  ["AR petition YEAR", "YEAR", "1"],
  ["AR order Day", "Day", "1.The Defendant was arrested on t"],
  ["AR order Month", "Month", "1.The Defendant was arrested on the _______ day of"],
  ["AR order Year", "Year", "1"],
  ["AR misdemeanours Day 01", "Day 01", "1. The Defendant was arrested on the _______ day of ________"],
  ["AR community-punishment MONTH 1", "MONTH 1", "1.The defendant was arrested on the _______ day of"],
  ["AR nolle-prosequi YEAR 1", "YEAR 1", "1. The Defendant was arrested on the _______ day of ________"]
];
for (const [what, name, label] of DATE_COMPONENTS) {
  const decision = decideBinding({ name, pdfType: "text", effectiveLabel: label });
  check(`${what} does not bind the participant's name`,
    !(decision.writable === true && decision.factId === NAME_FACT),
    `${JSON.stringify(name)} -> ${decision.factId ?? decision.reason}`);
}

// Controls. The rule must reach a bare date component and nothing near it.
const NOT_DATE_COMPONENTS = [
  ["a date of birth", "DOB", "participant.date_of_birth"],
  ["a birthday field", "Birthday", null],
  ["a day-phone field", "DayPhone", "participant.phone"],
  ["a signature date", "Date Signed", "deterministic.filing_date"]
];
for (const [what, name] of NOT_DATE_COMPONENTS) {
  check(`${what} is not treated as a date component`, !isDateComponentFieldName(name), name);
}
check("a bare date component is recognised under every spelling this corpus uses",
  ["DAY", "Day", "day", "MONTH", "Month", "YEAR", "Year", "Day 01", "MONTH 1", "Year_3", "day 2"]
    .every((n) => isDateComponentFieldName(n)));

// The fallback is withheld, not overridden: a date component whose own NAME
// matched a fact would still bind it. None does today, which is why the guard
// sits inside the fallback rather than in front of the name channel.
check("the guard only ever withholds the printed-label fallback",
  descriptorsMatching("DAY").length === 0 && descriptorsMatching("MONTH").length === 0
  && descriptorsMatching("YEAR").length === 0);

// ---- 1b. DEFECT B: a caption naming every part asks for the whole name -------
const EVERY_PART = [
  ["Arkansas ACIC's defendant caption", "First Middle and Last name"],
  ["Alabama SBI Form 46's applicant caption", "Full Name First Middle Last Suffix"],
  ["the same caption as the form prints it", "Full Name (First, Middle, Last, Suffix)"]
];
for (const [what, caption] of EVERY_PART) {
  check(`${what} resolves to the whole name`,
    descriptorsMatching(caption)[0]?.factId === NAME_FACT,
    `${caption} -> ${descriptorsMatching(caption)[0]?.factId}`);
  check(`${what} no longer resolves to a part of the name`,
    !NAME_PARTS.includes(descriptorsMatching(caption)[0]?.factId ?? ""));
}

// Controls. A caption naming ONE part is that part, and two parts are not three.
const STILL_PARTS = [
  ["First Name", "participant.first_name"],
  ["Last Name", "participant.last_name"],
  ["Middle Initial", "participant.middle_name"],
  ["Surname", "participant.last_name"],
  ["First and Last Name", "participant.last_name"],
  ["Defendant Last Name", "participant.last_name"]
];
for (const [caption, expected] of STILL_PARTS) {
  check(`"${caption}" still resolves to ${expected}`,
    descriptorsMatching(caption)[0]?.factId === expected,
    `-> ${descriptorsMatching(caption)[0]?.factId}`);
}
check("the every-part predicate is exported and separately callable",
  typeof captionAsksForEveryNamePart === "function"
  && captionAsksForEveryNamePart("First Middle and Last name") === true
  && captionAsksForEveryNamePart("First and Last Name") === false
  && captionAsksForEveryNamePart("Last Name") === false
  // it needs the word "name", not merely the three part words
  && captionAsksForEveryNamePart("first middle last") === false);

// ---- 2. the blast radius -----------------------------------------------------
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
const readJson = (rel) => {
  try { return JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8")); } catch { return null; }
};

function project(mod) {
  const rows = new Map();
  for (const { familyDirectory, file } of CENSUSES) {
    for (const { field, documentId, captionOnly } of blanksOf(readJson(file))) {
      const subject = field.effectiveLabel ?? field.name;
      const decision = mod.decideBinding({
        name: field.name, pdfType: field.type,
        effectiveLabel: field.effectiveLabel ?? null, regionHeading: field.regionHeading ?? null
      }, { captionOnly });
      rows.set(`${familyDirectory}|${documentId ?? "-"}|${field.name}`, {
        fieldName: field.name,
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

const stage = fs.mkdtempSync(path.join(os.tmpdir(), "name-date-verify-"));
const basePath = path.join(stage, "semantics-base.mjs");
fs.writeFileSync(basePath, execFileSync("git", ["show", `${BASE_SHA}:${SEMANTICS}`], { cwd: rootDir, maxBuffer: 1 << 24 }));
const baseModule = await import(pathToFileURL(basePath).href);
const before = project(baseModule);
const after = project(semantics);
fs.rmSync(stage, { recursive: true, force: true });

const movedKeys = [...before.keys()]
  .filter((k) => JSON.stringify(before.get(k)) !== JSON.stringify(after.get(k))).sort();
const record = readJson(RECORD);
const expectedKeys = [...(record?.expectedChangeKeys ?? [])].sort();

check("the committed record exists and names an expected-change set", expectedKeys.length > 0, RECORD);
check("no field outside the expected-change set moves",
  movedKeys.filter((k) => !expectedKeys.includes(k)).length === 0,
  movedKeys.filter((k) => !expectedKeys.includes(k)).slice(0, 6).join("; "));
check("every field in the expected-change set actually moves",
  expectedKeys.filter((k) => !movedKeys.includes(k)).length === 0,
  expectedKeys.filter((k) => !movedKeys.includes(k)).slice(0, 6).join("; "));
check("every changed field is explained by a stated defect",
  (record?.fieldsUnexplained ?? -1) === 0
  && (record?.changed ?? []).every((c) => c.changeClass !== "unexplained" && c.why),
  `${record?.fieldsUnexplained} unexplained`);
check("the record scanned every committed census, including census-v1",
  record?.censusesScanned === CENSUSES.length
  && record?.totalFieldsScanned === before.size
  && (record?.censusFiles ?? []).some((f) => f.endsWith("field-census.census-v1.json")),
  `${record?.censusesScanned} of ${CENSUSES.length} censuses, ${record?.totalFieldsScanned} of ${before.size} fields`);

// ---- 3. protection -----------------------------------------------------------
const baseCategories = baseModule.PROTECT_RULES.map(([c]) => c);
const nowCategories = PROTECT_RULES.map(([c]) => c);
check("no protect category is removed",
  baseCategories.every((c) => nowCategories.includes(c)),
  baseCategories.filter((c) => !nowCategories.includes(c)).join(", "));

const weakened = [];
for (const [category, pattern] of baseModule.PROTECT_RULES) {
  const now = PROTECT_RULES.find(([c]) => c === category);
  if (!now) { weakened.push(`${category} (missing)`); continue; }
  const lost = pattern.source.split("|").filter((t) => !now[1].source.includes(t));
  if (lost.length) weakened.push(`${category} lost ${lost.join(", ")}`);
}
check("no protect rule is weakened", weakened.length === 0, weakened.join("; "));

/*
 * PROTECTION MAY BE GAINED. IT MAY NOT BE LOST.
 *
 * This read "no field's protect category changes" and forbade movement in both
 * directions, which made it assert that the protect rules must never improve --
 * and improving them is the whole repair when a form spells an identifier in a
 * way the rule did not anticipate. NC AOC-CR-287 and AOC-CR-296 name the box
 * `SNN`, WV SCA-C906 `PetSocSecno`, IN CCA-XP-0220-7009 `AliasNamesDOBsSSNs`;
 * before the rule reached them the shared semantics bound a date of birth into
 * two of those Social Security blanks and a full legal name into the third.
 * A check that fails when that is fixed is not defending the participant.
 *
 * The dangerous direction is already covered three ways -- no category removed,
 * no rule weakened, nothing protected today becomes writable -- so what is left
 * for this one is the direction those do not see: a field that HAD a category
 * and now has none, or has a DIFFERENT one, since a reclassification can hide a
 * loss inside a change. Gaining protection where there was none is allowed, and
 * it is not unexamined: every moved field must still appear in the committed
 * record with a stated defect, which the check above holds at zero unexplained.
 */
const protectLost = movedKeys.filter((k) => {
  const was = before.get(k).protectCategory;
  const now = after.get(k).protectCategory;
  return was !== now && was !== null;
});
check("no field loses or changes an existing protect category", protectLost.length === 0, protectLost.slice(0, 6).join("; "));

const nowWritable = movedKeys.filter((k) => before.get(k).bindingWritable === false && after.get(k).bindingWritable === true);
check("no refused field becomes writable", nowWritable.length === 0, nowWritable.slice(0, 6).join("; "));

// A protected field must stay refused whatever else moved.
const lostProtection = [...before.keys()].filter((k) =>
  before.get(k).protectCategory !== null && after.get(k).bindingWritable === true);
check("nothing protected today becomes writable", lostProtection.length === 0, lostProtection.slice(0, 6).join("; "));

// ---- 4. the invariants, recomputed ------------------------------------------
const dateComponentNames = (rows) => [...rows.values()].filter((r) =>
  isDateComponentFieldName(r.fieldName) && r.bindingWritable && r.bindingFactId === NAME_FACT);
const partOfAWholeName = (rows) => [...rows.values()].filter((r) =>
  captionAsksForEveryNamePart(r.fieldName) && r.bindingWritable && NAME_PARTS.includes(r.bindingFactId ?? ""));

check("the correction had something to correct",
  dateComponentNames(before).length > 0 && partOfAWholeName(before).length > 0,
  `${dateComponentNames(before).length} date components, ${partOfAWholeName(before).length} name captions`);
check("no date-component blank binds a writable participant name",
  dateComponentNames(after).length === 0,
  dateComponentNames(after).map((r) => r.fieldName).slice(0, 6).join("; "));
check("no caption naming every part binds only a part",
  partOfAWholeName(after).length === 0,
  partOfAWholeName(after).map((r) => r.fieldName).slice(0, 6).join("; "));

console.log("");
if (failures.length) {
  console.error(`shared name/date field semantics: ${failures.length} problem(s).`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`shared name/date field semantics: ${CENSUSES.length} censuses, ${before.size} fields, `
  + `${movedKeys.length} moved exactly as recorded, `
  + `${dateComponentNames(before).length} -> 0 date components taking a name, `
  + `${partOfAWholeName(before).length} -> 0 whole-name captions taking a part.`);
