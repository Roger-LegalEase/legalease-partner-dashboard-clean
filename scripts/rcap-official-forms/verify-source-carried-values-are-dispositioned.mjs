#!/usr/bin/env node
// Every value an official source ships inside a field must be dispositioned by
// somebody, on the record, before that family's bytes go out.
//
//   node scripts/rcap-official-forms/verify-source-carried-values-are-dispositioned.mjs \
//     [--family <id>] [--json] [--allow-empty]
//
// WHAT THIS EXISTS TO CATCH
//
// A blank official form is not blank. Courts ship forms with /V already set on
// text fields -- a zero on a financial line, a date in a declaration block --
// put there for a person filling the form in by hand. The finalizer's
// structural default is `preserve_source_appearance`: anything that is not a
// control or an unanswered chooser is treated as the court's own ink and
// carried onto the filing. That default is right far more often than it is
// wrong, and being wrong towards preservation leaves the court's own text in
// place while being wrong the other way erases it.
//
// It is wrong in one specific way. When the shipped value sits in a field the
// PARTICIPANT was supposed to answer, preserving it prints an answer the
// participant never gave. On the Texas Statement of Inability to Afford Payment
// of Court Costs that is a sworn zero on a financial line, under penalty of
// perjury, in a packet whose own field map refuses to write the field precisely
// because "the platform holds no financial fact about any participant, and a
// guessed figure on a sworn affidavit is a worse defect than a blank one". The
// refusal is honoured on the write path and defeated on the flatten path.
//
// WHY NOTHING ELSE SEES IT
//
// The nine packet-completeness counters cannot: every one of them asks about
// what the build WROTE, what it left blank, or what it failed to classify. This
// value was never written, the blank is correctly classified as the
// participant's to supply, and the ink arrives from the source binary during
// flatten. tx_nd_dwi_probation-set stood at COMPLETE_PACKET_PROVEN with all
// nine counters at zero while shipping two of these.
//
// Nor does reading the text. pdftotext returns an identical clean reading on a
// dirty family and its byte-clean sibling, because these glyphs are drawn with
// /Arial, which it cannot map. Only the repository's own flattened-widget
// reader settles what a delivered page draws.
//
// THE ASSERTION
//
// For every family whose census rows carry a non-null source value, each such
// value must be EITHER
//
//   (A) classified for that `family:component` in
//       data/rcap-all50/shared/field-appearance-semantics.json, or
//   (B) named in that build's own `clearSourceCarriedTextValues`, the finalizer
//       argument that deletes /V and every widget /AP before flatten.
//
// They are mirror images and both work: (A) decides what the appearance MEANS
// and lets the finalizer act on it, (B) removes the appearance before the
// question arises. Two lanes reached for one each. This asks only that one of
// them was reached for, by name, for that exact field.
//
// Classification is not the same as suppression, and this check does not
// require suppression. `preserve_source_appearance` is a legitimate answer --
// it says a human read the field and decided the text is the court's own. What
// is refused is SILENCE: a value that reaches a participant's filing because
// nobody ever looked at it.
//
// THE DENOMINATOR
//
// A checker that examines nothing reports nothing wrong, and this operation has
// been bitten by that shape repeatedly. So the denominator is stated on every
// run -- families examined, families carrying a non-null source value, values
// in total -- and a run whose denominator collapses THROWS instead of passing.
// The likeliest way to collapse it is real: the census schema spells the field
// `sourceValuePresentInBlankForm`, and it is easy to write a reader that looks
// for `sourceValue`, finds nothing anywhere, and reports a clean corpus. Both
// spellings are read here, and finding zero of either is a failure.
//
// ABSENT IS NOT CLEAN, AND IT IS NOT DIRTY EITHER
//
// A sparse checkout hides files without deleting them. A tripwire that read
// absence as a finding once reported 49 false erasures. So a family whose
// builder is not on disk is reported NOT_EXAMINABLE and counted separately: it
// is neither a pass nor a finding, because remedy (B) lives in the builder and
// cannot be ruled out from a file that is not there.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CENSUS_ROOT = path.join(ROOT, "data/rcap-all50/overlays/census-v1");
const REGISTRY = path.join(ROOT, "data/rcap-all50/shared/field-appearance-semantics.json");

const argv = process.argv.slice(2);
const familyFilter = argv.includes("--family") ? argv[argv.indexOf("--family") + 1] : null;
const asJson = argv.includes("--json");
const allowEmpty = argv.includes("--allow-empty");

/** A refusal that is about the instrument, not about the corpus. */
class BrokenDenominator extends Error {}

/* ---- the census: what each source ships, per family and component ---------- */

function censusFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...censusFiles(p));
    else if (entry.name === "field-census.census-v1.json") out.push(p);
  }
  return out.sort();
}

// The schema spells it `sourceValuePresentInBlankForm`; one committed census
// spells it `sourceValue`. Reading only one of them is how this check would
// silently measure nothing, so both are read and which one was found is kept.
const SOURCE_VALUE_KEYS = ["sourceValuePresentInBlankForm", "sourceValue"];
function sourceValueOf(row) {
  for (const key of SOURCE_VALUE_KEYS) {
    if (Object.hasOwn(row, key) && row[key] !== null && row[key] !== undefined) {
      return { key, value: row[key] };
    }
  }
  return null;
}

/* ---- remedy A: the appearance registry ------------------------------------- */

function loadRegistry() {
  // The registry is one shared file. If it is absent nothing here can be
  // judged, so this is a broken instrument rather than a clean corpus.
  if (!fs.existsSync(REGISTRY)) {
    throw new BrokenDenominator(
      `the appearance registry is not in the working tree: ${path.relative(ROOT, REGISTRY)}\n`
      + "Every family would look undispositioned, which is a fact about this checkout and not about the corpus."
    );
  }
  const registry = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
  return registry.families ?? {};
}

/* ---- remedy B: clearSourceCarriedTextValues, read out of the build ---------- */

/**
 * What a builder asks the finalizer to clear, per component.
 *
 * This reads the build's own source rather than running it, because running a
 * builder writes a family. The one shape in the tree is
 *
 *   clearSourceCarriedTextValues: source.componentId === STATEMENT
 *     ? [...STATEMENT_SOURCE_CARRIED_VALUES] : []
 *
 * so an identifier has to be resolvable to a string or a string array, and the
 * component the clearing is gated on has to be recovered. Anything this cannot
 * read is reported UNREADABLE rather than treated as absent: a remedy that
 * might be there and cannot be seen is not evidence that it is not there, and
 * quietly counting it as missing would manufacture findings.
 */
function clearedByBuilder(builderPath) {
  const src = fs.readFileSync(builderPath, "utf8");
  if (!src.includes("clearSourceCarriedTextValues")) {
    return { present: false, byComponent: new Map(), unconditional: new Set(), unreadable: [] };
  }

  // Resolvable constants: `const NAME = "..."` and `const NAME = [...]` /
  // `Object.freeze([...])` holding only string literals.
  const strings = new Map();
  for (const m of src.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*"((?:[^"\\]|\\.)*)"\s*;/g)) {
    strings.set(m[1], JSON.parse(`"${m[2]}"`));
  }
  const arrays = new Map();
  for (const m of src.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:Object\.freeze\(\s*)?\[([\s\S]*?)\]\s*\)?\s*;/g)) {
    const body = m[2];
    if (/[^\s"',\w$\/.:()\-\[\]]/.test(body.replace(/"(?:[^"\\]|\\.)*"/g, ""))) continue;
    const items = [...body.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((s) => JSON.parse(`"${s[1]}"`));
    if (items.length) arrays.set(m[1], items);
  }

  const byComponent = new Map();
  const unconditional = new Set();
  const unreadable = [];

  // Take the expression assigned to the key, up to the end of its line-ish
  // region. Builders here write it on one logical line.
  for (const m of src.matchAll(/clearSourceCarriedTextValues\s*:\s*([^\n]*)/g)) {
    const expr = m[1];
    if (/^\s*\[\s*\]\s*,?\s*$/.test(expr)) continue; // an explicit empty list clears nothing

    const fields = new Set();
    for (const s of expr.matchAll(/"((?:[^"\\]|\\.)*)"/g)) fields.add(JSON.parse(`"${s[1]}"`));
    for (const id of expr.matchAll(/\.\.\.\s*([A-Za-z_$][\w$]*)|\b([A-Za-z_$][\w$]*)\b/g)) {
      const name = id[1] ?? id[2];
      if (arrays.has(name)) for (const f of arrays.get(name)) fields.add(f);
    }
    if (fields.size === 0) { unreadable.push(expr.trim()); continue; }

    // The component this clearing is gated on, if any.
    const guards = new Set();
    for (const g of expr.matchAll(/componentId\s*===\s*("((?:[^"\\]|\\.)*)"|([A-Za-z_$][\w$]*))/g)) {
      if (g[2] !== undefined) guards.add(JSON.parse(`"${g[2]}"`));
      else if (strings.has(g[3])) guards.add(strings.get(g[3]));
      else unreadable.push(expr.trim());
    }
    if (guards.size === 0) { for (const f of fields) unconditional.add(f); continue; }
    for (const c of guards) {
      if (!byComponent.has(c)) byComponent.set(c, new Set());
      for (const f of fields) byComponent.get(c).add(f);
    }
  }
  return { present: true, byComponent, unconditional, unreadable };
}

/** Which build wrote this family, according to the family's own build status. */
function builderFor(familyDir, familyId) {
  const statusPath = path.join(familyDir, "build-status.json");
  let declared = null;
  if (fs.existsSync(statusPath)) {
    try { declared = JSON.parse(fs.readFileSync(statusPath, "utf8")).builtBy ?? null; } catch { declared = null; }
  }
  const candidates = [
    declared,
    `scripts/build-census-v1-${familyId}.mjs`
  ].filter(Boolean);
  for (const rel of candidates) {
    const abs = path.resolve(ROOT, rel);
    if (fs.existsSync(abs)) return { path: abs, rel, declared };
  }
  return { path: null, rel: candidates[0] ?? null, declared };
}

/* ---- the run ---------------------------------------------------------------- */

function run() {
  const files = censusFiles(CENSUS_ROOT);
  if (files.length === 0) {
    throw new BrokenDenominator(
      `no field-census.census-v1.json under ${path.relative(ROOT, CENSUS_ROOT)}\n`
      + "A run that examines zero families cannot report a clean corpus. Check the working tree, not the corpus."
    );
  }

  const registryFamilies = loadRegistry();

  let familiesExamined = 0;
  let familiesCarrying = 0;
  let valuesExamined = 0;
  const keySpellingsSeen = new Set();
  const findings = [];
  const notExaminable = [];
  const dispositioned = [];

  for (const file of files) {
    const census = JSON.parse(fs.readFileSync(file, "utf8"));
    const familyId = census.familyId;
    if (familyFilter && familyId !== familyFilter) continue;
    familiesExamined += 1;

    const carried = [];
    for (const doc of census.documents ?? []) {
      for (const row of doc.rows ?? []) {
        const sv = sourceValueOf(row);
        if (!sv) continue;
        keySpellingsSeen.add(sv.key);
        carried.push({ componentId: doc.documentId, field: row.field, value: sv.value, policy: row.policy ?? null, page: row.page ?? null });
      }
    }
    if (carried.length === 0) continue;
    familiesCarrying += 1;
    valuesExamined += carried.length;

    const familyDir = path.dirname(file);
    const builder = builderFor(familyDir, familyId);

    // Remedy B is inside the builder. Without the builder on disk the family is
    // not examinable -- reporting it undispositioned would be a claim about a
    // file this checkout does not have.
    let cleared = null;
    if (builder.path) {
      cleared = clearedByBuilder(builder.path);
    } else {
      notExaminable.push({
        familyId, values: carried.length,
        reason: "the build named by build-status.json is not in the working tree",
        builderExpected: builder.rel
      });
      continue;
    }

    for (const item of carried) {
      const registryKey = `${familyId}:${item.componentId}`;
      const entry = registryFamilies[registryKey];
      const classified = entry?.fields?.[item.field] ?? null;
      const clearedHere = cleared.byComponent.get(item.componentId) ?? new Set();
      const namedInClear = clearedHere.has(item.field) || cleared.unconditional.has(item.field);

      if (classified) {
        dispositioned.push({ ...item, familyId, by: "appearance-registry", disposition: classified.disposition ?? "(no disposition recorded)" });
        continue;
      }
      if (namedInClear) {
        dispositioned.push({ ...item, familyId, by: "clearSourceCarriedTextValues", disposition: "value and widget appearances deleted before flatten" });
        continue;
      }
      if (cleared.unreadable.length > 0) {
        notExaminable.push({
          familyId, componentId: item.componentId, field: item.field, values: 1,
          reason: "the builder passes clearSourceCarriedTextValues in a form this reader cannot resolve; the remedy may be present",
          builder: builder.rel, expressions: cleared.unreadable
        });
        continue;
      }
      findings.push({
        familyId,
        componentId: item.componentId,
        field: item.field,
        sourceShips: item.value,
        page: item.page,
        censusPolicy: item.policy,
        missingRemedyA: `no entry for field ${JSON.stringify(item.field)} under ${JSON.stringify(registryKey)} in data/rcap-all50/shared/field-appearance-semantics.json`
          + (entry ? ` (the family:component IS classified, for ${Object.keys(entry.fields ?? {}).length} other field(s): ${Object.keys(entry.fields ?? {}).map((f) => JSON.stringify(f)).join(", ")})` : " (that family:component has no registry entry at all)"),
        missingRemedyB: cleared.present
          ? `${builder.rel} passes clearSourceCarriedTextValues but does not name ${JSON.stringify(item.field)} for component ${JSON.stringify(item.componentId)}`
          : `${builder.rel} never passes clearSourceCarriedTextValues`,
        whatShips: `the delivered pages carry ${JSON.stringify(item.value)} in a field no participant answered`
      });
    }
  }

  if (familiesExamined === 0) {
    throw new BrokenDenominator(
      familyFilter
        ? `no census matched --family ${familyFilter}. A filter that matches nothing is not a pass.`
        : "zero families examined. A universal negative from an empty denominator is not a clean corpus."
    );
  }
  if (familiesCarrying === 0 && !allowEmpty) {
    throw new BrokenDenominator(
      "zero families carry a non-null source value, across " + familiesExamined + " famil(ies) examined.\n"
      + `This is the shape of a broken reader, not a clean corpus: the census spells this field one of ${SOURCE_VALUE_KEYS.map((k) => JSON.stringify(k)).join(" or ")},\n`
      + "and a reader looking for the wrong spelling finds nothing everywhere. Confirm by hand, then pass --allow-empty."
    );
  }

  return {
    familiesExamined, familiesCarrying, valuesExamined,
    keySpellingsSeen: [...keySpellingsSeen].sort(),
    dispositioned, findings, notExaminable
  };
}

let result;
try {
  result = run();
} catch (error) {
  if (error instanceof BrokenDenominator) {
    console.error("BROKEN_DENOMINATOR");
    console.error(error.message);
    process.exit(2);
  }
  throw error;
}

if (asJson) {
  console.log(JSON.stringify({ schemaVersion: "rcap-source-carried-values-dispositioned/v1", ...result }, null, 2));
} else {
  console.log("");
  console.log("  Source-carried values, and whether anybody dispositioned them");
  console.log("");
  console.log(`  families examined ............................. ${result.familiesExamined}`);
  console.log(`  families carrying a non-null source value ..... ${result.familiesCarrying}`);
  console.log(`  source-carried values examined ................ ${result.valuesExamined}`);
  console.log(`  census spellings read .......................... ${result.keySpellingsSeen.join(", ")}`);
  console.log(`  dispositioned ................................. ${result.dispositioned.length}`);
  console.log(`  not examinable in this working tree ........... ${result.notExaminable.length}`);
  console.log(`  UNDISPOSITIONED ............................... ${result.findings.length}`);
  console.log("");

  const byRemedy = result.dispositioned.reduce((acc, d) => { acc[d.by] = (acc[d.by] ?? 0) + 1; return acc; }, {});
  for (const [remedy, n] of Object.entries(byRemedy)) console.log(`    ${String(n).padStart(3)} by ${remedy}`);
  if (result.dispositioned.length) console.log("");

  for (const n of result.notExaminable) {
    console.log(`  NOT_EXAMINABLE  ${n.familyId}${n.field ? ` :: ${n.componentId} :: ${n.field}` : ""}`);
    console.log(`                  ${n.reason}`);
    if (n.builderExpected) console.log(`                  expected at ${n.builderExpected}`);
  }
  if (result.notExaminable.length) console.log("");

  for (const f of result.findings) {
    console.log(`  UNDISPOSITIONED  ${f.familyId}`);
    console.log(`     component     ${f.componentId}`);
    console.log(`     field         ${JSON.stringify(f.field)}${f.page !== null ? `  (source page ${f.page})` : ""}`);
    console.log(`     source ships  ${JSON.stringify(f.sourceShips)}${f.censusPolicy ? `  [census policy: ${f.censusPolicy}]` : ""}`);
    console.log(`     remedy A      MISSING - ${f.missingRemedyA}`);
    console.log(`     remedy B      MISSING - ${f.missingRemedyB}`);
    console.log(`     what ships    ${f.whatShips}`);
    console.log("");
  }

  // A clean verdict is only clean over what was actually read. Saying
  // "every value is dispositioned" when some could not be examined is the
  // universal negative this check exists to refuse.
  const unexamined = result.notExaminable.reduce((n, r) => n + (r.values ?? 0), 0);
  if (result.findings.length > 0) {
    console.log(`  ${result.findings.length} SOURCE-CARRIED VALUE(S) REACH A PARTICIPANT'S FILING WITH NO RECORDED DECISION`);
  } else if (unexamined > 0) {
    console.log(`  NO_UNDISPOSITIONED_VALUE_AMONG_THE_${result.valuesExamined - unexamined}_THIS_TREE_COULD_EXAMINE`);
    console.log(`  ${unexamined} value(s) in ${result.notExaminable.length} famil(ies) were NOT examined; this is not a pass over them.`);
  } else {
    console.log("  EVERY_SOURCE_CARRIED_VALUE_IS_DISPOSITIONED");
  }
  console.log("");
}

process.exit(result.findings.length === 0 ? 0 : 1);
