#!/usr/bin/env node
// Guards the lane 2 semantic decision against the finalized artifacts themselves.
//
//   node scripts/verify-rcap-lane2-widget-text-semantics.mjs
//   node scripts/verify-rcap-lane2-widget-text-semantics.mjs --mutations
//
// The defect this exists for: a finalizer rule that suppresses widget appearance
// text by storage class or /Ff flags. Session 8 tried exactly that — suppress
// every unwritten /Tx appearance — and it erased official court captions along
// with the chooser prompt, because on these forms official static text and the
// placeholder are stored the same way.
//
// So the invariant is not "the placeholder is gone". It is:
//
//   1. every official static string the decision says to PRESERVE is still
//      present in every family it belongs to, and
//   2. the placeholder appears in NO family outside the four it was classified
//      on — neither DC-1-15, nor any Kentucky or Vermont family.
//
// (1) fails the moment anyone reintroduces a storage-based rule. (2) fails if a
// suppression rule is written narrowly enough to pass (1) but the classification
// is later widened to families that were never measured to carry the prompt.
// Both hold before the rerender and after it, which is what makes this a
// regression test rather than a snapshot of the current defect.
//
// Text is read the way the finalizer writes it: one Tj per word, parens escaped
// octally, inside XObject appearance streams. Per-item extraction and a
// `(...)Tj` regex both miss it, and missing it reads as "clean".
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUTATIONS = process.argv.includes("--mutations");

const DISPATCH = "data/rcap-all50/gate-b-assignments/session-dispatch.json";
const abs = (p) => path.join(rootDir, p);
const readJson = (p) => JSON.parse(fs.readFileSync(abs(p), "utf8"));

/**
 * Every string literal in every stream of a PDF, joined per stream.
 *
 * Joined rather than inspected individually because the finalizer splits a
 * caption across one literal per word; `("COUNTY,")("NEBRASKA")` only matches
 * once the literals are concatenated. Octal escapes are decoded because the
 * prompt's own parentheses are written `\050` and `\051`.
 */
function streamTexts(buf) {
  const s = buf.toString("latin1");
  const out = [];
  let i = 0;
  while (true) {
    const st = s.indexOf("stream", i);
    if (st < 0) break;
    const en = s.indexOf("endstream", st);
    if (en < 0) break;
    let start = st + 6;
    if (s.charCodeAt(start) === 13) start += 1;
    if (s.charCodeAt(start) === 10) start += 1;
    const objAt = s.lastIndexOf(" obj", st);
    const header = s.slice(Math.max(0, objAt - 200), st);
    let body = buf.subarray(start, en);
    if (/\/FlateDecode/.test(header)) {
      try { body = zlib.inflateSync(body); } catch { /* not every stream is text */ }
    }
    const text = body.toString("latin1");
    const lits = [];
    const re = /\((?:\\.|[^()\\])*\)/gs;
    let m;
    while ((m = re.exec(text))) {
      lits.push(m[0].slice(1, -1)
        .replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
        .replace(/\\([()\\])/g, "$1"));
    }
    if (lits.length) {
      out.push({ joined: lits.join(""), spaced: lits.join(" "),
        isWidgetAppearance: /\/Subtype\s*\/Form/.test(header) });
    }
    i = en + 9;
  }
  return out;
}

// Whitespace is not load-bearing here: the finalizer's word split means the same
// caption can arrive with or without the spaces between literals.
const squash = (t) => t.replace(/\s+/g, "").toLowerCase();

function findText(streams, needle) {
  const want = squash(needle);
  for (const st of streams) {
    if (squash(st.joined).includes(want) || squash(st.spaced).includes(want)) return st;
  }
  return null;
}

const wave = readJson(DISPATCH).lane2EvidenceWave;
const semantics = wave?.widgetTextSemantics;
if (!semantics) {
  console.error("verify-rcap-lane2-widget-text-semantics FAILED — the dispatch carries no widgetTextSemantics decision");
  process.exit(1);
}

const packageDirFor = new Map(wave.families.map((f) => [f.familyId, f.packageDirectory]));
const scope = wave.dispatch?.classification?.familyIds ?? [];
const placeholderRules = semantics.placeholderSuppressWhenUnwritten ?? [];
const preserveRules = semantics.officialStaticTextPreserve ?? [];
if (!placeholderRules.length || !preserveRules.length) {
  console.error("verify-rcap-lane2-widget-text-semantics FAILED — the decision records no placeholder or no preserve rule");
  process.exit(1);
}

// Read every artifact once; both checks ask different questions of the same bytes.
const ARTIFACT = "fixtures/canonical-filled.pdf";
function loadStreams(familyId, overrides = {}) {
  if (Object.prototype.hasOwnProperty.call(overrides, familyId)) return overrides[familyId];
  const dir = packageDirFor.get(familyId);
  if (!dir) return null;
  const file = abs(`${dir}/${ARTIFACT}`);
  if (!fs.existsSync(file)) return null;
  return streamTexts(fs.readFileSync(file));
}

/**
 * `rules` is passed in rather than closed over so --mutations can hand this the
 * same logic with a deliberately broken decision and watch it fail.
 */
function failures({ placeholder, preserve, artifactOverrides = {} }) {
  const problems = [];
  const cache = new Map();
  const streamsFor = (familyId) => {
    if (!cache.has(familyId)) cache.set(familyId, loadStreams(familyId, artifactOverrides));
    return cache.get(familyId);
  };

  // 1. Official static text survives wherever the decision scopes it.
  for (const rule of preserve) {
    // matchAs, not text: a disposition may name the caption the way a person
    // reads it ("IN THE ___ COURT OF") while the bytes carry only the part
    // around the blank. The rule is asserted through the literal that exists.
    const needle = rule.matchAs ?? rule.text;
    for (const familyId of rule.families ?? scope) {
      const streams = streamsFor(familyId);
      if (!streams) { problems.push(`${familyId}: no ${ARTIFACT} to check "${rule.text}" against`); continue; }
      if (!findText(streams, needle)) {
        problems.push(`${familyId}: official static text "${rule.text}" is absent (matched as "${needle}") — a suppression rule removed a court caption`);
      }
    }
  }

  // 2. The placeholder appears nowhere it was not classified.
  for (const rule of placeholder) {
    const classified = new Set(rule.families ?? []);
    for (const familyId of packageDirFor.keys()) {
      if (classified.has(familyId)) continue;
      const streams = streamsFor(familyId);
      if (!streams) continue;
      if (findText(streams, rule.text)) {
        problems.push(`${familyId}: placeholder "${rule.text}" is present but this family carries no placeholder disposition`);
      }
    }
  }
  return problems;
}

if (MUTATIONS) {
  const realPreserve = preserveRules;
  const realPlaceholder = placeholderRules;
  // A stream set with the official caption stripped, standing in for the
  // artifact a storage-based suppression rule would produce.
  const strippedNebraska = (() => {
    const streams = loadStreams("NE:cc-6-11-form-en") ?? [];
    return streams.filter((st) => !squash(st.joined).includes(squash("COUNTY, NEBRASKA"))
      && !squash(st.spaced).includes(squash("COUNTY, NEBRASKA")));
  })();

  const mutations = [
    {
      name: "a suppression rule strips COUNTY, NEBRASKA from a filed artifact",
      run: () => failures({ placeholder: realPlaceholder, preserve: realPreserve,
        artifactOverrides: { "NE:cc-6-11-form-en": strippedNebraska } })
    },
    {
      name: "the DC-1-15 case-type heading is reclassified as a placeholder",
      run: () => failures({
        preserve: realPreserve.filter((r) => r.text !== "Type of Case - Check only one:"),
        placeholder: [{ text: "Type of Case - Check only one:", families: [] }]
      })
    },
    {
      name: "the chooser prompt is claimed on a Kentucky family that never carried it",
      run: () => failures({ preserve: realPreserve,
        placeholder: realPlaceholder.map((r) => ({ ...r, families: ["KY:aoc-496-form-en"] })) })
    }
  ];

  let undetected = 0;
  for (const mutation of mutations) {
    const caught = mutation.run().length > 0;
    console.log(`${caught ? "detected" : "UNDETECTED"} — ${mutation.name}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-lane2-widget-text-semantics FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nEvery way of losing official text or widening the placeholder is detected (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

const problems = failures({ placeholder: placeholderRules, preserve: preserveRules });
if (problems.length > 0) {
  console.error(`verify-rcap-lane2-widget-text-semantics FAILED — ${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(` - ${problem}`);
  process.exit(1);
}

const preserveChecks = preserveRules.reduce((n, r) => n + (r.families ?? scope).length, 0);
console.log(
  `lane 2 widget-text semantics hold: ${preserveChecks} official-static-text assertion(s) across ` +
  `${scope.length} classification-scope famil(ies), and the chooser prompt appears in none of the ` +
  `${packageDirFor.size - (placeholderRules[0].families ?? []).length} wave families outside its classification.`
);
console.log(
  "This checks meaning against bytes, not the presence of the defect: it passes before the rerender and " +
  "must keep passing after it. It does not assert the placeholder is gone — Session 8's rerender does that."
);
