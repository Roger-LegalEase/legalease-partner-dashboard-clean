#!/usr/bin/env node
// Exactly which blanks the shared caption-infrastructure correction moves, and why each one.
//
//   node scripts/rcap-official-forms/diff-shared-caption-infrastructure-semantics.mjs
//
// SIX DEFECTS, FIXED IN ONE COMMIT AND IN ONE ORDER.
//
// Five of them are protections that were missing, and one is a caption harvest
// that was imprecise. The order is not a preference. Making the harvest precise
// FIRST would have narrowed captions that several blanks were being protected by
// -- accidentally, because a run-on caption reaching across a printed table row
// happened to contain the word "Signature" or "Judge" -- and for the length of
// that window a jurat blank and a court's own judgment date would have been free
// to take participant data. So the protections land first and the precision
// second, and this record is written to show that the second could not have
// opened anything the first had not already closed.
//
//   P1 court_contact. Nothing protected a court's own contact block, and three
//      descriptors were happy to fill it: participant.phone matches a bare
//      /telephone/, participant.email a bare /e-mail/, and
//      participant.street_address refuses the word "court" but not
//      "courthouse". CT JD-CR-202's COURTADDRESS took the participant's home
//      address; MI MC 227a's ctaddress and cttelno took their phone number;
//      twelve Colorado forms name a blank "Court Address" outright.
//
//   P2 the jurat vocabulary. PROTECT_RULES/notarization carried `notar` and
//      `jurat` and nothing else, so an affiant, a verification, an administered
//      oath and the "sworn to and subscribed" clause were unguarded at
//      classification. Alabama SBI Form 46's jurat block prints two witness rows
//      whose blanks are named "City State and Zip_2", and the participant's own
//      city was writable into a WITNESS's address on a sworn affidavit.
//
//   P3 the heading vocabulary. REGION_HEADING_RULES gained the certificate of
//      mailing, the affidavit and oath section headings, and the verification
//      clause Michigan MC 227a heads its certificate block with. MC 227a's
//      `comdate` and `comsig` were refused only because nothing happened to
//      match their names -- which the family that built it reported as a gap
//      rather than a guarantee.
//
//   P4 the squashed signature-date spelling. `\bsigned\b` cannot see
//      `datesigned`, because the haystack's squashed half has no boundary
//      there -- but deterministic.filing_date's /date\s*signed/ can. Six
//      Nebraska blanks named `datesigned` took the platform's filing date and
//      dated a signature the participant has not made.
//
//   P5 the judgment stem. CT JD-CR-202 spells its two judgment blanks
//      TOWNJUDGMNT and DATEJUDGMNT, vowel dropped and welded to the word before
//      them, so neither `\bjudge\b` nor `\bjudgment\b` reaches either.
//
//   P6 the venue recital. `participant.state` matched a bare /state/, so "THE
//      PEOPLE OF The State of Michigan" and "STATE OF MICHIGAN ____ JUDICIAL
//      DISTRICT" were both questions about the participant's residence.
//
//   C  "crime" in the charge vocabulary. CHARGE_VALUE_WORDS spelled charge,
//      offence, count, statute and violation. MC 227a heads the offence column
//      of its conviction listing CRIME and CT JD-CR-202 captions a blank
//      "Crime(s) defendant asks the court to erase" -- and the participant's
//      name was writable into the second of those. Narrowly: a crime victim is
//      a person, so that phrase is removed before the vocabulary is asked.
//
//   D  the generic Date path. A blank whose own NAME says it holds a date may
//      now take only a DATE from its printed label. Arkansas names two blanks
//      `DATE 01` and `Date Completed` under a sentence that says "Defendant",
//      and the participant's name bound to the date they completed a drug-court
//      programme. The dead /^\s*dated?\s*$/ alternative, which could never match
//      a haystack and so refused a bare "Date" by accident rather than by rule,
//      is removed rather than repaired.
//
//   K  the caption harvest. captureWidgetContext's "directly above" branch
//      tested the whole printed LINE against the widget and handed back the
//      whole line's TEXT, while its "to the left" branch was cell-aware. On a
//      form whose caption row is a multi-cell table header every widget beneath
//      it harvested the same concatenated string. It is now cell-aware in the
//      same way, and whitespace is collapsed exactly as groupIntoLines collapses
//      it, so a single-cell line returns byte-for-byte what it returned before.
//
// WHY A DIFF RECORD RATHER THAN AN ASSERTION.
//
// Every censused blank in the corpus passes through this binder, and "it should
// only affect the fields I was shown" is not evidence. Two projections are taken
// over EVERY committed census, under either filename:
//
//   * `semanticsOnly` holds the censuses at the base commit and moves only the
//     binder, which isolates P1-P6, C and D;
//   * `endToEnd` moves both, which is what the corpus actually says now, and is
//     the only projection in which K is visible at all -- K changes what a
//     census RECORDS, so it cannot show up in a projection over fixed censuses.
//
// A row neither projection can classify is reported as `unexplained`, and that
// is the number that has to be zero.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(rootDir);

const SEMANTICS = "scripts/rcap-official-forms/rcap-field-semantics.mjs";
const CAPTURE = "scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs";
// The Captain head this correction was cut from.
const BASE_SHA = "0c429cbee66bf1fe92c4fc4c9dcbb7871c103a4a";
const OVERLAY_ROOT = "data/rcap-all50/overlays";
const OUT = "data/rcap-grade-a/field-semantics/shared-caption-infrastructure-classification-diff.json";
const CENSUS_FILENAMES = ["field-census.json", "field-census.census-v1.json"];
const NAME_FACTS = new Set([
  "participant.full_legal_name", "participant.first_name", "participant.middle_name", "participant.last_name"
]);

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

/** A census as it stands at a commit, or null where that commit did not carry it. */
function censusAt(sha, file) {
  try {
    return JSON.parse(execFileSync("git", ["show", `${sha}:${file}`], { cwd: rootDir, maxBuffer: 1 << 26 }).toString("utf8"));
  } catch { return null; }
}

/**
 * Every censused blank through one version of the semantics, reading the
 * censuses from one version of the tree.
 *
 * `regionIsDocumentTitle` is passed where a census records it, exactly as
 * finalizeOfficialForm passes it, so a heading that is only the form's own name
 * does not protect. Most censuses predate that key and do not carry it; for
 * those the flag is absent here as it is absent in the factory, and the record
 * says so rather than assuming either way.
 */
function project(mod, censusSource) {
  const rows = new Map();
  for (const { familyDirectory, file } of CENSUSES) {
    const census = censusSource === "worktree" ? readJson(file) : censusAt(censusSource, file);
    if (!census) continue;
    for (const { field, documentId, captionOnly } of blanksOf(census)) {
      const subject = field.effectiveLabel ?? field.name;
      const decision = mod.decideBinding({
        name: field.name,
        pdfType: field.type,
        effectiveLabel: field.effectiveLabel ?? null,
        regionHeading: field.regionHeading ?? null,
        regionIsDocumentTitle: field.regionIsDocumentTitle === true
      }, { captionOnly });
      rows.set(`${familyDirectory}|${documentId ?? "-"}|${field.name}`, {
        familyDirectory,
        censusFile: file,
        documentId,
        fieldName: field.name,
        effectiveLabel: field.effectiveLabel ?? null,
        labelBasis: field.labelBasis ?? null,
        regionHeading: field.regionHeading ?? null,
        subjectFirstDescriptor: mod.descriptorsMatching(subject)[0]?.factId ?? null,
        byNameDescriptors: mod.descriptorsMatching(field.name).map((d) => d.factId),
        byLabelDescriptors: field.effectiveLabel
          ? mod.descriptorsMatching(field.effectiveLabel).map((d) => d.factId) : [],
        protectCategory: mod.protectCategoryOf(subject) ?? mod.protectCategoryOf(field.name) ?? null,
        bindingWritable: decision.writable === true,
        bindingFactId: decision.factId ?? null,
        bindingReason: decision.reason ?? null,
        bindingCategory: decision.category ?? null
      });
    }
  }
  return rows;
}

const stage = fs.mkdtempSync(path.join(os.tmpdir(), "shared-caption-diff-"));
const basePath = path.join(stage, "semantics-base.mjs");
fs.writeFileSync(basePath, execFileSync("git", ["show", `${BASE_SHA}:${SEMANTICS}`], { cwd: rootDir, maxBuffer: 1 << 24 }));
const baseModule = await import(pathToFileURL(basePath).href);
const nowModule = await import(pathToFileURL(path.resolve(rootDir, SEMANTICS)).href);
fs.rmSync(stage, { recursive: true, force: true });

const comparable = (r) => JSON.stringify({
  d: r.subjectFirstDescriptor, n: r.byNameDescriptors, l: r.byLabelDescriptors,
  p: r.protectCategory, w: r.bindingWritable, f: r.bindingFactId, r: r.bindingReason, c: r.bindingCategory,
  e: r.effectiveLabel, b: r.labelBasis
});

/**
 * Which defect explains one moved row.
 *
 * Classification is by the SHAPE OF THE MOVE, read off the row and re-derived
 * from the live rules, not from a list of field names written down in advance.
 * A list would pass by construction; this returns null for anything the eight
 * defects do not account for, and the null count is what the verifier holds at
 * zero.
 */
function classify(b, a) {
  const captionChanged = b.effectiveLabel !== a.effectiveLabel;
  const cat = a.bindingCategory ?? a.protectCategory;

  if (cat === "court_contact") {
    return { defect: "P1", class: "court_contact_block_is_now_protected", why:
      "The blank names a court's or clerk's own address, telephone, fax or e-mail. Nothing protected a court's "
      + "contact block, and participant.phone, participant.email and participant.street_address each matched one "
      + "of those captions. It is refused by category now." };
  }
  if (a.protectCategory === "notarization" && b.protectCategory !== "notarization") {
    return { defect: "P2", class: "jurat_field_is_now_protected_by_name", why:
      "The field name or its printed caption carries an officer construction -- 'sworn to and subscribed', "
      + "'subscribed and sworn', an administered oath, an affiant or a verification -- which PROTECT_RULES/"
      + "notarization did not spell. A jurat is an officer's certificate and the platform is not the officer." };
  }
  if (a.bindingReason === "protected_page_region" && b.bindingReason !== "protected_page_region") {
    return { defect: "P3", class: "blank_sits_in_a_sworn_or_mailing_region_now_recognised", why:
      "The printed section heading over the blank is an affidavit, an oath, a certificate of mailing or the "
      + "verification clause a Michigan certificate is headed with. REGION_HEADING_RULES did not carry any of "
      + "them, so the region channel returned null over a block nobody but an officer completes." };
  }
  if (a.protectCategory === "signature" && b.protectCategory !== "signature") {
    return { defect: "P4", class: "signature_date_spelled_without_the_space_is_now_protected", why:
      "The name spells its signature date squashed -- `datesigned`, `DATESIGN`, `...SignDate` -- so `\\bsigned\\b` "
      + "found no word boundary and deterministic.filing_date's /date\\s*signed/ did. The platform was dating a "
      + "signature the participant has not made." };
  }
  if (a.protectCategory === "court" && b.protectCategory !== "court") {
    return { defect: "P5", class: "judgment_block_is_now_protected_by_stem", why:
      "The name or caption says judgment with the vowel dropped or welded to the word before it (TOWNJUDGMNT, "
      + "DATEJUDGMNT), which neither `\\bjudge\\b` nor `\\bjudgment\\b` reaches. The court's own judgment block is "
      + "the court's." };
  }
  // P6 is stated as "participant.state stopped being a candidate", not as
  // "the binding changed". On six North Carolina forms the County blank's
  // harvested caption is "STATE OF NORTH CAROLINA" and participant.state was
  // among its matches all along; it lost only because matter.county matched by
  // NAME and won most-specific-first. A wrong candidate that loses a race is
  // still a wrong candidate, and the row is recorded rather than passed over
  // because its outcome happened to be right.
  const stateWasACandidate = (r) => r.subjectFirstDescriptor === "participant.state"
    || r.byNameDescriptors.includes("participant.state") || r.byLabelDescriptors.includes("participant.state");
  if (stateWasACandidate(b) && !stateWasACandidate(a)) {
    return { defect: "P6", class: "venue_recital_no_longer_asks_for_the_participants_state", why:
      "The caption recites a sovereign -- 'The State of Michigan', 'STATE OF MICHIGAN', 'STATE OF NORTH CAROLINA' "
      + "-- which is the court's own venue and not a question about where the participant lives. participant.state "
      + "is no longer a candidate for it. 'State of Residence', 'State of Birth' and 'State of Issue' still are." };
  }
  if (nowModule.captionDescribesChargeValue(b.effectiveLabel ?? b.fieldName)
      && !baseModule.captionDescribesChargeValue(b.effectiveLabel ?? b.fieldName)) {
    return { defect: "C", class: "crime_caption_is_now_a_charge_value_and_refuses_a_name", why:
      "The caption presents a CRIME as the thing the blank holds, and CHARGE_VALUE_WORDS spelled charge, offence, "
      + "count, statute and violation but not crime. full_legal_name's caption refusal therefore never ran over "
      + "it. A crime victim is excluded from the widening: that is a person." };
  }
  if (nowModule.fieldNameDeclaresADate(b.fieldName)
      && b.byNameDescriptors.length === 0
      && b.byLabelDescriptors.length > 0) {
    return { defect: "D", class: "date_named_blank_no_longer_takes_a_non_date_fact_from_its_label", why:
      "The blank's own NAME says it holds a date and its name matched no descriptor, so the printed label decided "
      + "and offered a fact of the wrong kind -- a participant's name, a county, a charge. The label may now supply "
      + "only a date to a blank whose name says it is one. This withholds an offer; it cannot create one." };
  }
  if (captionChanged || b.labelBasis !== a.labelBasis) {
    return { defect: "K", class: "caption_harvest_is_now_cell_accurate", why:
      "The caption printed directly above this blank was harvested as the whole printed LINE and is now harvested "
      + "as the cell of that line printed over the blank. Where the line was one cell the caption is unchanged "
      + "byte for byte and only `labelBasis` moves, from ..._in_the_same_column to ..._in_the_same_cell, because "
      + "the branch no longer claims to have matched a column when what it matched was a cell. Where the line was "
      + "a table row, each widget beneath it now carries its own column's caption instead of the concatenation of "
      + "all of them." };
  }
  return null;
}

// ---- the two projections -----------------------------------------------------
const censusesAtBase = project(baseModule, BASE_SHA);
const semanticsOnlyAfter = project(nowModule, BASE_SHA);
const endToEndAfter = project(nowModule, "worktree");

function changesBetween(before, after) {
  const changed = [];
  for (const [key, b] of before) {
    const a = after.get(key);
    if (!a) {
      changed.push({ key, fieldName: b.fieldName, changeClass: "field_disappeared_from_the_census",
        defect: null, why: "A blank present at the base commit is absent now. That is a stop, not a note.",
        from: b, to: null });
      continue;
    }
    if (comparable(b) === comparable(a)) continue;
    const reason = classify(b, a);
    changed.push({
      key,
      familyDirectory: b.familyDirectory,
      censusFile: b.censusFile,
      documentId: b.documentId,
      fieldName: b.fieldName,
      defect: reason?.defect ?? null,
      changeClass: reason?.class ?? "unexplained",
      why: reason?.why ?? "This row moved and no stated defect explains it. That is a stop, not a note.",
      from: { effectiveLabel: b.effectiveLabel, labelBasis: b.labelBasis, writable: b.bindingWritable,
        factId: b.bindingFactId, reason: b.bindingReason, category: b.bindingCategory,
        firstDescriptor: b.subjectFirstDescriptor, byName: b.byNameDescriptors, byLabel: b.byLabelDescriptors,
        protectCategory: b.protectCategory },
      to: { effectiveLabel: a.effectiveLabel, labelBasis: a.labelBasis, writable: a.bindingWritable,
        factId: a.bindingFactId, reason: a.bindingReason, category: a.bindingCategory,
        firstDescriptor: a.subjectFirstDescriptor, byName: a.byNameDescriptors, byLabel: a.byLabelDescriptors,
        protectCategory: a.protectCategory }
    });
  }
  return changed.sort((x, y) => x.key.localeCompare(y.key));
}

const semanticsOnly = changesBetween(censusesAtBase, semanticsOnlyAfter);
const endToEnd = changesBetween(censusesAtBase, endToEndAfter);

// ---- the direction of every move --------------------------------------------
const summarise = (changed, before, after) => ({
  fieldsChanged: changed.length,
  fieldsExplained: changed.filter((c) => c.changeClass !== "unexplained").length,
  fieldsUnexplained: changed.filter((c) => c.changeClass === "unexplained").length,
  byChangeClass: changed.reduce((acc, c) => { acc[c.changeClass] = (acc[c.changeClass] ?? 0) + 1; return acc; }, {}),
  byDefect: changed.reduce((acc, c) => { acc[c.defect ?? "none"] = (acc[c.defect ?? "none"] ?? 0) + 1; return acc; }, {}),
  refusalsGained: changed.filter((c) => c.from.writable && !c.to.writable).length,
  becameWritable: changed.filter((c) => !c.from.writable && c.to.writable).map((c) => c.key),
  stillWritableWithADifferentFact: changed
    .filter((c) => c.from.writable && c.to.writable && c.from.factId !== c.to.factId)
    .map((c) => ({ key: c.key, from: c.from.factId, to: c.to.factId })),
  everyKey: changed.map((c) => c.key)
});

// Protection is compared rule by rule and row by row: no category may vanish, no
// rule may lose a term, and no field that was refused may become writable.
const baseCategories = baseModule.PROTECT_RULES.map(([c]) => c);
const nowCategories = nowModule.PROTECT_RULES.map(([c]) => c);
const lostTerms = [];
for (const [category, pattern] of baseModule.PROTECT_RULES) {
  const now = nowModule.PROTECT_RULES.find(([c]) => c === category);
  if (!now) { lostTerms.push(`${category} (missing)`); continue; }
  const lost = pattern.source.split("|").filter((t) => !now[1].source.includes(t));
  if (lost.length) lostTerms.push(`${category} lost ${lost.join(", ")}`);
}
const baseRegionCategories = baseModule.REGION_HEADING_RULES.map(([c]) => c);
const nowRegionCategories = nowModule.REGION_HEADING_RULES.map(([c]) => c);

// A protected field that becomes writable is the one thing this correction must
// never do, in either projection.
const protectedThenWritable = (before, after) => [...before.keys()].filter((k) =>
  before.get(k).protectCategory !== null && after.get(k)?.bindingWritable === true);

// A blank whose caption or name says it holds a charge, offence, crime, count,
// statute or violation must not carry a participant name, recomputed rather than
// asserted.
const chargeBlankTakingAName = (rows) => [...rows.values()].filter((r) => r.bindingWritable
  && NAME_FACTS.has(r.bindingFactId ?? "")
  && [r.fieldName, r.effectiveLabel].filter(Boolean)
    .some((t) => nowModule.CHARGE_VALUE_WORDS.test(String(t).replace(nowModule.CRIME_WORD_THAT_NAMES_A_PERSON, " "))));

const dateNamedBlankTakingANonDate = (rows) => [...rows.values()].filter((r) => r.bindingWritable
  && nowModule.fieldNameDeclaresADate(r.fieldName)
  && NAME_FACTS.has(r.bindingFactId ?? ""));

const courtContactBlankWritable = (rows) => [...rows.values()].filter((r) => r.bindingWritable
  && (nowModule.protectCategoryOf(r.effectiveLabel ?? r.fieldName) === "court_contact"
    || nowModule.protectCategoryOf(r.fieldName) === "court_contact"));

const record = {
  schemaVersion: "rcap-shared-caption-infrastructure-diff/v1",
  generatedBy: "scripts/rcap-official-forms/diff-shared-caption-infrastructure-semantics.mjs",
  baseCommit: BASE_SHA,
  semanticsModule: SEMANTICS,
  captureModule: CAPTURE,
  question:
    "Which committed blanks does the shared caption-infrastructure correction move, does a stated defect explain "
    + "every one, and did the precision half open anything the protection half had not already closed?",
  orderOfWork: {
    statement:
      "The protections were added before the caption harvest was made precise, and this record separates the two "
      + "so the claim is checkable rather than asserted.",
    whyItMatters:
      "Three CT JD-CR-202 blanks and one MI MC 227a blank were protected only by accident: their captions were "
      + "run-ons reaching across a printed table row, and the run-on happened to contain 'Signature' or 'Judge'. "
      + "Narrowing the caption first would have taken that away while nothing else guarded them -- DATESIGN[0] and "
      + "DATESIGN[1] would have carried the caption 'Date' with no protect category, and DATEJUDGMNT the caption "
      + "'On (Date)' with none. The signature rule now reaches DATESIGN by name and the court rule reaches "
      + "DATEJUDGMNT by stem, so both are refused on their own account before the caption narrows.",
    protectionsFirst: ["P1", "P2", "P3", "P4", "P5", "P6", "C", "D"],
    precisionSecond: ["K"]
  },
  censusesScanned: CENSUSES.length,
  censusFiles: CENSUSES.map((c) => c.file),
  familiesScanned: new Set(CENSUSES.map((c) => c.familyDirectory)).size,
  totalFieldsScanned: censusesAtBase.size,
  scanNote:
    "Every committed census is read, under either filename, so the five census-v1 families are included alongside "
    + "the flat ones. The base-commit projections read each census as it stood at "
    + `${BASE_SHA.slice(0, 9)} rather than from the worktree, so the semantics-only projection isolates the binder `
    + "from the caption harvest.",
  semanticsOnly: {
    question:
      "Holding every census exactly as the base commit recorded it, which blanks does the BINDER alone move?",
    ...summarise(semanticsOnly),
    changed: semanticsOnly
  },
  endToEnd: {
    question:
      "Moving both the binder and the caption harvest, which blanks does the corpus report differently now? This is "
      + "the only projection in which the harvest change is visible, because it changes what a census records.",
    ...summarise(endToEnd),
    changed: endToEnd
  },
  protection: {
    statement:
      "No protect category is removed, no protect rule loses a term, and no field that was protected at the base "
      + "commit is writable now -- in either projection. Every move this correction makes is from writable toward "
      + "refused, or from one refusal to a better-stated one, or from a wrong fact to the right one.",
    protectCategoriesRemoved: baseCategories.filter((c) => !nowCategories.includes(c)),
    protectCategoriesAdded: nowCategories.filter((c) => !baseCategories.includes(c)),
    regionHeadingCategoriesRemoved: baseRegionCategories.filter((c) => !nowRegionCategories.includes(c)),
    protectRulesWeakened: lostTerms,
    protectedAtBaseAndWritableAfterSemantics: protectedThenWritable(censusesAtBase, semanticsOnlyAfter),
    protectedAtBaseAndWritableEndToEnd: protectedThenWritable(censusesAtBase, endToEndAfter),
    fieldsThatBecameWritableSemanticsOnly: semanticsOnly.filter((c) => !c.from.writable && c.to.writable).map((c) => c.key),
    fieldsThatBecameWritableEndToEnd: endToEnd.filter((c) => !c.from.writable && c.to.writable).map((c) => c.key),
    holds: baseCategories.every((c) => nowCategories.includes(c))
      && baseRegionCategories.every((c) => nowRegionCategories.includes(c))
      && lostTerms.length === 0
      && protectedThenWritable(censusesAtBase, semanticsOnlyAfter).length === 0
      && protectedThenWritable(censusesAtBase, endToEndAfter).length === 0
      && semanticsOnly.every((c) => c.from.writable || !c.to.writable)
      && endToEnd.every((c) => c.from.writable || !c.to.writable)
  },
  invariants: [
    {
      id: "no_charge_or_crime_blank_carries_a_participant_name",
      statement:
        "No blank whose name or caption presents a charge, offence, crime, count, statute or violation as the "
        + "thing it holds may resolve to a writable participant name, in either projection.",
      before: chargeBlankTakingAName(censusesAtBase).length,
      afterSemanticsOnly: chargeBlankTakingAName(semanticsOnlyAfter).length,
      afterEndToEnd: chargeBlankTakingAName(endToEndAfter).length,
      offendingBefore: chargeBlankTakingAName(censusesAtBase).map((r) => ({ field: r.fieldName, label: r.effectiveLabel })),
      holds: chargeBlankTakingAName(semanticsOnlyAfter).length === 0 && chargeBlankTakingAName(endToEndAfter).length === 0
    },
    {
      id: "no_date_named_blank_carries_a_participant_name",
      statement:
        "No blank whose own name says it holds a date may resolve to a writable participant name.",
      before: dateNamedBlankTakingANonDate(censusesAtBase).length,
      afterSemanticsOnly: dateNamedBlankTakingANonDate(semanticsOnlyAfter).length,
      afterEndToEnd: dateNamedBlankTakingANonDate(endToEndAfter).length,
      offendingBefore: dateNamedBlankTakingANonDate(censusesAtBase).map((r) => ({ field: r.fieldName, label: r.effectiveLabel })),
      holds: dateNamedBlankTakingANonDate(semanticsOnlyAfter).length === 0
        && dateNamedBlankTakingANonDate(endToEndAfter).length === 0
    },
    {
      id: "no_court_contact_blank_is_writable",
      statement:
        "No blank naming a court's or clerk's address, telephone, fax or e-mail may be writable.",
      before: courtContactBlankWritable(censusesAtBase).length,
      afterSemanticsOnly: courtContactBlankWritable(semanticsOnlyAfter).length,
      afterEndToEnd: courtContactBlankWritable(endToEndAfter).length,
      offendingBefore: courtContactBlankWritable(censusesAtBase).map((r) => ({ field: r.fieldName, label: r.effectiveLabel, boundTo: r.bindingFactId })),
      holds: courtContactBlankWritable(semanticsOnlyAfter).length === 0
        && courtContactBlankWritable(endToEndAfter).length === 0
    }
  ],
  expectedChangeKeys: endToEnd.map((c) => c.key)
};

fs.mkdirSync(path.join(rootDir, path.dirname(OUT)), { recursive: true });
fs.writeFileSync(path.join(rootDir, OUT), `${JSON.stringify(record, null, 2)}\n`);

console.log(`${record.totalFieldsScanned} field(s) across ${record.censusesScanned} census(es)`);
for (const [label, side] of [["semantics only", record.semanticsOnly], ["end to end", record.endToEnd]]) {
  console.log(`${label}: ${side.fieldsChanged} changed, ${side.fieldsUnexplained} unexplained, `
    + `${side.refusalsGained} writable -> refused, ${side.becameWritable.length} refused -> writable`);
  for (const [cls, n] of Object.entries(side.byDefect)) console.log(`    ${String(n).padStart(3)}  defect ${cls}`);
}
console.log(`protection holds: ${record.protection.holds}`);
for (const i of record.invariants) console.log(`  ${i.id}: ${i.before} -> ${i.afterSemanticsOnly} / ${i.afterEndToEnd}  holds=${i.holds}`);
